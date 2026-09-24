from tests.integration.conftest import Account

_TINY_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde"
    b"\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)


async def _upload_chat_wallpaper(account: Account) -> str:
    reserved = await account.post(
        "/media/uploads",
        json={
            "kind": "photo",
            "purpose": "chat_wallpaper",
            "mime_type": "image/png",
            "size_bytes": len(_TINY_PNG),
        },
    )
    assert reserved.status_code == 201, reserved.text
    media_id = reserved.json()["media"]["id"]
    uploaded = await account.client.put(
        f"/media/{media_id}/content",
        headers={**account.headers, "Content-Type": "image/png"},
        content=_TINY_PNG,
    )
    assert uploaded.status_code == 204, uploaded.text
    completed = await account.post(f"/media/{media_id}/complete")
    assert completed.status_code == 200, completed.text
    return media_id


def _code(response) -> str:
    return response.json()["detail"]["code"]


async def test_profile_update_and_username_uniqueness(alice: Account, bob: Account) -> None:
    updated = await alice.patch("/users/me", json={"display_name": "Alice", "bio": "hello"})
    assert updated.status_code == 200
    assert updated.json()["display_name"] == "Alice"

    taken = await alice.patch("/users/me", json={"username": bob.username.upper()})
    assert taken.status_code == 409
    assert _code(taken) == "username_already_taken"


async def test_search_and_public_profile(alice: Account, bob: Account) -> None:
    found = await alice.get("/users/search", params={"q": bob.username})
    assert [item["id"] for item in found.json()["items"]] == [bob.user_id]
    assert "email" not in found.json()["items"][0]

    profile = await alice.get(f"/users/{bob.user_id}")
    assert profile.status_code == 200
    missing = await alice.get("/users/00000000-0000-0000-0000-000000000000")
    assert _code(missing) == "user_not_found"


async def test_contacts_crud_and_pagination(alice: Account, bob: Account, carol: Account) -> None:
    assert _code(await alice.post("/contacts", json={"user_id": alice.user_id})) == "cannot_add_self_to_contacts"
    assert (await alice.post("/contacts", json={"user_id": bob.user_id, "alias": "Bobby"})).status_code == 201
    assert (await alice.post("/contacts", json={"user_id": carol.user_id})).status_code == 201
    assert _code(await alice.post("/contacts", json={"user_id": bob.user_id})) == "contact_already_exists"

    first_page = (await alice.get("/contacts", params={"limit": 1})).json()
    assert len(first_page["items"]) == 1 and first_page["next_cursor"]
    second_page = (await alice.get("/contacts", params={"limit": 1, "cursor": first_page["next_cursor"]})).json()
    assert len(second_page["items"]) == 1 and second_page["next_cursor"] is None
    ids = {first_page["items"][0]["user"]["id"], second_page["items"][0]["user"]["id"]}
    assert ids == {bob.user_id, carol.user_id}

    assert (await alice.delete(f"/contacts/{bob.user_id}")).status_code == 204
    assert _code(await alice.delete(f"/contacts/{bob.user_id}")) == "contact_not_found"
    assert _code(await alice.get("/contacts", params={"cursor": "%%%"})) == "invalid_cursor"


async def test_settings_defaults_and_updates(alice: Account) -> None:
    defaults = (await alice.get("/settings")).json()
    assert defaults["read_receipts_visible"] is True
    assert defaults["online_status_visibility"] == "everyone"
    assert defaults["theme"] == {}

    patched = await alice.patch("/settings", json={"read_receipts_visible": False, "language": "RU"})
    assert patched.json()["read_receipts_visible"] is False
    assert patched.json()["language"] == "ru"
    assert _code(await alice.patch("/settings", json={"language": "de"})) == "unsupported_language"

    theme = await alice.put("/settings/theme", json={"theme": {"primary": "#123456", "dark": True}})
    assert theme.json()["theme"] == {"primary": "#123456", "dark": True}
    wallpaper = await alice.put(
        "/settings/theme",
        json={"theme": {"mode": "light", "chatWallpaper": {"kind": "preset", "presetId": "dots"}}},
    )
    assert wallpaper.json()["theme"]["chatWallpaper"]["presetId"] == "dots"
    assert _code(
        await alice.put("/settings/theme", json={"theme": {"chatWallpaper": {"kind": "preset", "presetId": "nope"}}})
    ) == "invalid_theme_config"
    too_deep = await alice.put("/settings/theme", json={"theme": {"a": {"b": {"c": {"d": {"e": {"f": 1}}}}}}})
    assert _code(too_deep) == "invalid_theme_config"
    too_large = await alice.put("/settings/theme", json={"theme": {"blob": "x" * 20000}})
    assert _code(too_large) == "theme_config_too_large"


async def test_custom_chat_wallpaper_theme_persists(alice: Account) -> None:
    media_id = await _upload_chat_wallpaper(alice)
    saved = await alice.put(
        "/settings/theme",
        json={"theme": {"chatWallpaper": {"kind": "custom", "mediaId": media_id}}},
    )
    assert saved.status_code == 200, saved.text
    wallpaper = saved.json()["theme"]["chatWallpaper"]
    assert wallpaper == {"kind": "custom", "mediaId": media_id}
    assert isinstance(wallpaper["mediaId"], str)

    reloaded = (await alice.get("/settings")).json()["theme"]["chatWallpaper"]
    assert reloaded == wallpaper


async def test_last_seen_visibility(alice: Account, bob: Account) -> None:
    await bob.patch("/settings", json={"online_status_visibility": "nobody"})
    profile = (await alice.get(f"/users/{bob.user_id}")).json()
    assert profile["last_seen_at"] is None
