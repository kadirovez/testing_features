"""End-to-end media smoke test: presigned upload to S3, Celery thumbnails, attachments, avatars.

Usage: python scripts/media_smoke.py http://localhost:8000
Requires a running Celery worker and S3-compatible storage (MinIO).
"""

import asyncio
import io
import json
import sys
from typing import Any
from uuid import uuid4

import httpx
import websockets
from PIL import Image

PASSWORD = "correct-horse-battery"


def check(condition: bool, label: str) -> None:
    print(("PASS " if condition else "FAIL ") + label)
    if not condition:
        raise SystemExit(1)


def png_bytes(width: int, height: int) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (width, height), (200, 30, 90)).save(buffer, format="PNG")
    return buffer.getvalue()


async def register(http: httpx.AsyncClient, base: str) -> dict[str, Any]:
    username = f"md_{uuid4().hex[:10]}"
    tokens = (
        await http.post(
            f"{base}/auth/register",
            json={"email": f"{username}@example.com", "username": username, "password": PASSWORD, "display_name": username},
        )
    ).json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    me = (await http.get(f"{base}/users/me", headers=headers)).json()
    return {**tokens, "user_id": me["id"], "headers": headers}


async def upload(http: httpx.AsyncClient, base: str, user: dict[str, Any], kind: str, purpose: str, mime: str, data: bytes) -> dict[str, Any]:
    created = await http.post(
        f"{base}/media/uploads",
        json={"kind": kind, "purpose": purpose, "mime_type": mime, "size_bytes": len(data)},
        headers=user["headers"],
    )
    assert created.status_code == 201, created.text
    body = created.json()
    stored = await http.post(body["upload_url"], data=body["upload_fields"], files={"file": ("upload", data, mime)})
    assert stored.status_code in (200, 204), stored.text
    return body


async def wait_media_ready(ws: websockets.ClientConnection, media_id: str) -> dict[str, Any]:
    async with asyncio.timeout(30):
        while True:
            event = json.loads(await ws.recv())
            if event["type"] == "media_ready" and event["payload"]["media_id"] == media_id:
                return event["payload"]


async def main(base: str) -> None:
    async with httpx.AsyncClient(timeout=30) as http:
        alice = await register(http, base)
        bob = await register(http, base)
        carol = await register(http, base)
        code = lambda response: response.json()["detail"]["code"]  # noqa: E731

        bad_mime = await http.post(
            f"{base}/media/uploads",
            json={"kind": "photo", "purpose": "message", "mime_type": "application/pdf", "size_bytes": 10},
            headers=alice["headers"],
        )
        check(code(bad_mime) == "unsupported_media_type", "unsupported mime rejected")
        too_big = await http.post(
            f"{base}/media/uploads",
            json={"kind": "photo", "purpose": "message", "mime_type": "image/png", "size_bytes": 10**10},
            headers=alice["headers"],
        )
        check(code(too_big) == "media_too_large", "oversized upload rejected")
        video_avatar = await http.post(
            f"{base}/media/uploads",
            json={"kind": "video", "purpose": "avatar", "mime_type": "video/mp4", "size_bytes": 10},
            headers=alice["headers"],
        )
        check(code(video_avatar) == "unsupported_media_type", "video avatar rejected")

        never_uploaded = await http.post(
            f"{base}/media/uploads",
            json={"kind": "photo", "purpose": "message", "mime_type": "image/png", "size_bytes": 10},
            headers=alice["headers"],
        )
        missing = await http.post(f"{base}/media/{never_uploaded.json()['media']['id']}/complete", headers=alice["headers"])
        check(code(missing) == "upload_not_found_in_storage", "confirm without upload rejected")

        declared = await http.post(
            f"{base}/media/uploads",
            json={"kind": "photo", "purpose": "message", "mime_type": "image/png", "size_bytes": 10},
            headers=alice["headers"],
        )
        body = declared.json()
        oversized = await http.post(body["upload_url"], data=body["upload_fields"], files={"file": ("x", png_bytes(50, 50), "image/png")})
        check(oversized.status_code == 400 and "EntityTooLarge" in oversized.text, "S3 policy enforces declared size")

        ws_url = base.replace("http", "ws", 1) + f"/ws?token={alice['access_token']}"
        async with websockets.connect(ws_url) as ws:
            photo = await upload(http, base, alice, "photo", "message", "image/png", png_bytes(800, 600))
            media_id = photo["media"]["id"]
            confirmed = await http.post(f"{base}/media/{media_id}/complete", headers=alice["headers"])
            check(confirmed.json()["status"] == "uploaded", "upload confirmed")
            again = await http.post(f"{base}/media/{media_id}/complete", headers=alice["headers"])
            check(code(again) == "media_already_confirmed", "double confirm rejected")

            ready = await wait_media_ready(ws, media_id)
            check(ready["status"] == "ready", "media_ready pushed over WS after Celery processing")
            meta = (await http.get(f"{base}/media/{media_id}", headers=alice["headers"])).json()
            check(meta["width"] == 800 and meta["height"] == 600 and meta["has_thumbnail"], "metadata extracted")

            thumb_url = (await http.get(f"{base}/media/{media_id}/url", params={"variant": "thumbnail"}, headers=alice["headers"])).json()["url"]
            thumb = Image.open(io.BytesIO((await http.get(thumb_url)).content))
            check(thumb.format == "JPEG" and max(thumb.size) == 320, "thumbnail downloadable via presigned GET")

            chat = (await http.post(f"{base}/chats/direct", json={"user_id": bob["user_id"]}, headers=alice["headers"])).json()
            message = (
                await http.post(f"{base}/chats/{chat['id']}/messages", json={"content": "pic", "media_ids": [media_id]}, headers=alice["headers"])
            ).json()
            check(message["type"] == "photo" and message["attachments"][0]["id"] == media_id, "photo message with attachment")
            reuse = await http.post(f"{base}/chats/{chat['id']}/messages", json={"media_ids": [media_id]}, headers=alice["headers"])
            check(code(reuse) == "media_not_attachable", "media cannot be attached twice")

            bob_url = await http.get(f"{base}/media/{media_id}/url", headers=bob["headers"])
            check(bob_url.status_code == 200, "chat member can download attachment")
            original = await http.get(bob_url.json()["url"])
            check(original.status_code == 200 and original.content[:4] == b"\x89PNG", "original downloadable")
            carol_url = await http.get(f"{base}/media/{media_id}/url", headers=carol["headers"])
            check(code(carol_url) == "media_access_denied", "outsider cannot download attachment")

            avatar = await upload(http, base, alice, "photo", "avatar", "image/png", png_bytes(256, 256))
            avatar_id = avatar["media"]["id"]
            await http.post(f"{base}/media/{avatar_id}/complete", headers=alice["headers"])
            wrong_avatar = await http.put(f"{base}/users/me/avatar", json={"media_id": media_id}, headers=alice["headers"])
            check(code(wrong_avatar) == "invalid_avatar_media", "message media cannot be an avatar")
            set_avatar = await http.put(f"{base}/users/me/avatar", json={"media_id": avatar_id}, headers=alice["headers"])
            check(set_avatar.json()["avatar_media_id"] == avatar_id, "avatar set")
            carol_avatar = await http.get(f"{base}/media/{avatar_id}/url", headers=carol["headers"])
            check(carol_avatar.status_code == 200, "avatars are visible to any user")

            video = await upload(http, base, alice, "video", "message", "video/mp4", b"\x00\x00\x00\x18ftypmp42not-a-real-video")
            await http.post(f"{base}/media/{video['media']['id']}/complete", headers=alice["headers"])
            video_ready = await wait_media_ready(ws, video["media"]["id"])
            check(video_ready["status"] in ("ready", "failed"), f"video processed by worker (status={video_ready['status']})")
    print("ALL MEDIA CHECKS PASSED")


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1]))
