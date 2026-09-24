"""End-to-end realtime smoke test against two running API instances.

Usage: python scripts/realtime_smoke.py http://localhost:8000 http://localhost:8001
Requires the rate limit to allow a burst of registrations (e.g. RATE_LIMIT_AUTH_PER_MINUTE>=10).
"""

import asyncio
import json
import sys
from typing import Any
from uuid import uuid4

import httpx
import websockets

PASSWORD = "correct-horse-battery"


class WSClient:
    def __init__(self, name: str, connection: websockets.ClientConnection) -> None:
        self.name = name
        self.connection = connection

    async def send(self, event_type: str, payload: dict[str, Any] | None = None) -> None:
        await self.connection.send(json.dumps({"type": event_type, "payload": payload or {}}))

    async def expect(self, event_type: str, timeout: float = 5.0) -> dict[str, Any]:
        """Wait for the next event of a type, skipping unrelated ones."""
        async with asyncio.timeout(timeout):
            while True:
                event = json.loads(await self.connection.recv())
                if event["type"] == event_type:
                    return event


async def register(http: httpx.AsyncClient, base: str) -> dict[str, Any]:
    username = f"rt_{uuid4().hex[:10]}"
    response = await http.post(
        f"{base}/auth/register",
        json={"email": f"{username}@example.com", "username": username, "password": PASSWORD, "display_name": username},
    )
    response.raise_for_status()
    tokens = response.json()
    me = (await http.get(f"{base}/users/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})).json()
    return {**tokens, "user_id": me["id"], "email": f"{username}@example.com", "name": username}


def ws_url(base: str, token: str, lang: str = "en") -> str:
    return base.replace("http", "ws", 1) + f"/ws?token={token}&lang={lang}"


def check(condition: bool, label: str) -> None:
    print(("PASS " if condition else "FAIL ") + label)
    if not condition:
        raise SystemExit(1)


async def main(base_a: str, base_b: str) -> None:
    async with httpx.AsyncClient(timeout=10) as http:
        alice = await register(http, base_a)
        bob = await register(http, base_a)
        auth_a = {"Authorization": f"Bearer {alice['access_token']}"}

        try:
            async with websockets.connect(ws_url(base_a, "garbage")) as bad:
                await bad.recv()
        except websockets.ConnectionClosed as exc:
            check(exc.rcvd is not None and exc.rcvd.code == 4401, "invalid token closes with 4401")

        async with websockets.connect(ws_url(base_a, alice["access_token"])) as raw_a:
            ws_a = WSClient("alice", raw_a)
            chat = (await http.post(f"{base_a}/chats/direct", json={"user_id": bob["user_id"]}, headers=auth_a)).json()

            async with websockets.connect(ws_url(base_b, bob["access_token"], "ru")) as raw_b:
                ws_b = WSClient("bob", raw_b)
                presence = await ws_a.expect("presence")
                check(presence["payload"] == {**presence["payload"], "user_id": bob["user_id"], "online": True}, "alice sees bob online (cross-instance)")

                sent = (
                    await http.post(f"{base_a}/chats/{chat['id']}/messages", json={"content": "hi bob"}, headers=auth_a)
                ).json()
                new = await ws_b.expect("message_new")
                check(new["payload"]["message"]["id"] == sent["id"], "bob receives message_new on another instance")

                await ws_b.send("message_delivered", {"message_ids": [sent["id"]]})
                delivered = await ws_a.expect("message_delivered")
                check(delivered["payload"]["message_ids"] == [sent["id"]], "alice receives message_delivered")

                await ws_b.send("typing_start", {"chat_id": chat["id"]})
                typing = await ws_a.expect("typing")
                check(typing["payload"]["is_typing"] and typing["payload"]["user_id"] == bob["user_id"], "alice receives typing")

                await ws_b.send("message_read", {"chat_id": chat["id"], "up_to_message_id": sent["id"]})
                read = await ws_a.expect("message_read")
                check(read["payload"]["message_ids"] == [sent["id"]], "alice receives message_read")

                await ws_b.send("does_not_exist")
                error = await ws_b.expect("error")
                check(error["payload"]["code"] == "event_type_unknown" and error["payload"]["message"] == "неизвестный тип события", "unknown event -> localized error")

                await ws_b.send("typing_start", {"chat_id": "not-a-uuid"})
                error = await ws_b.expect("error")
                check(error["payload"]["code"] == "event_payload_invalid", "invalid payload -> error")

                other_chat = str(uuid4())
                await ws_b.send("typing_start", {"chat_id": other_chat})
                error = await ws_b.expect("error")
                check(error["payload"]["code"] == "chat_not_found", "service AppError is relayed as error event")

                group = (
                    await http.post(f"{base_a}/chats/group", json={"title": "G", "member_ids": [bob["user_id"]]}, headers=auth_a)
                ).json()
                system = await ws_b.expect("message_new")
                text = system["payload"]["message"]["system_text"]
                check(system["payload"]["message"]["chat_id"] == group["id"] and "создал(а) чат" in text, "system message localized per connection (ru)")

                for _ in range(60):
                    await ws_b.send("ping")
                limited = await ws_b.expect("error")
                check(limited["payload"]["code"] == "event_rate_limit_exceeded", "per-connection WS rate limit")

                second_login = (
                    await http.post(f"{base_b}/auth/login", json={"email": bob["email"], "password": PASSWORD})
                ).json()
                await asyncio.sleep(1.1)
                revoke = await http.delete(
                    f"{base_b}/auth/sessions/{bob['session_id']}",
                    headers={"Authorization": f"Bearer {second_login['access_token']}"},
                )
                check(revoke.status_code == 204, "remote logout of bob's WS session")
                revoked = await ws_b.expect("session_revoked")
                check(revoked["payload"]["session_id"] == bob["session_id"], "bob receives session_revoked")
                try:
                    await asyncio.wait_for(raw_b.recv(), 5)
                except websockets.ConnectionClosed as exc:
                    check(exc.rcvd is not None and exc.rcvd.code == 4403, "revoked WS closed with 4403")

            offline = await ws_a.expect("presence")
            check(offline["payload"]["user_id"] == bob["user_id"] and offline["payload"]["online"] is False, "alice sees bob offline")
    print("ALL REALTIME CHECKS PASSED")


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1], sys.argv[2]))
