from uuid import uuid4

from tests.integration.conftest import Account


def _code(response) -> str:
    return response.json()["detail"]["code"]


async def test_direct_chat_is_unique(alice: Account, bob: Account) -> None:
    first = await alice.post("/chats/direct", json={"user_id": bob.user_id})
    second = await bob.post("/chats/direct", json={"user_id": alice.user_id})
    assert first.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    assert first.json()["peer"]["id"] == bob.user_id
    assert _code(await alice.post("/chats/direct", json={"user_id": alice.user_id})) == "cannot_create_direct_with_self"
    chat_id = first.json()["id"]
    assert (await alice.post(f"/chats/{chat_id}/leave")).status_code == 204
    assert all(item["id"] != chat_id for item in (await alice.get("/chats")).json()["items"])
    reopened = await alice.post("/chats/direct", json={"user_id": bob.user_id})
    assert reopened.status_code == 200
    assert reopened.json()["id"] == chat_id


async def test_group_roles_matrix(alice: Account, bob: Account, carol: Account) -> None:
    created = await alice.post("/chats/group", json={"title": "Team", "member_ids": [bob.user_id]})
    assert created.status_code == 201
    chat_id = created.json()["id"]
    assert created.json()["my_role"] == "owner"

    # plain member cannot add or edit
    assert _code(await bob.post(f"/chats/{chat_id}/members", json={"user_id": carol.user_id})) == "not_allowed_to_add_members"
    assert _code(await bob.patch(f"/chats/{chat_id}", json={"title": "x"})) == "not_allowed_to_edit_chat"
    assert _code(await carol.get(f"/chats/{chat_id}")) == "not_chat_member"

    # owner promotes bob to admin, admin adds carol
    promoted = await alice.patch(f"/chats/{chat_id}/members/{bob.user_id}", json={"role": "admin"})
    assert promoted.json()["role"] == "admin"
    assert (await bob.post(f"/chats/{chat_id}/members", json={"user_id": carol.user_id})).status_code == 201
    assert _code(await bob.post(f"/chats/{chat_id}/members", json={"user_id": carol.user_id})) == "user_already_member"

    # admin cannot change roles or remove the owner; owner cannot change own role
    assert _code(await bob.patch(f"/chats/{chat_id}/members/{carol.user_id}", json={"role": "admin"})) == "not_allowed_to_change_roles"
    assert _code(await bob.delete(f"/chats/{chat_id}/members/{alice.user_id}")) == "cannot_remove_owner"
    assert _code(await alice.patch(f"/chats/{chat_id}/members/{alice.user_id}", json={"role": "member"})) == "cannot_change_own_role"

    # owner cannot leave before transferring ownership
    assert _code(await alice.post(f"/chats/{chat_id}/leave")) == "owner_must_transfer_ownership"
    transferred = await alice.patch(f"/chats/{chat_id}/members/{bob.user_id}", json={"role": "owner"})
    assert transferred.json()["role"] == "owner"
    assert (await alice.post(f"/chats/{chat_id}/leave")).status_code == 204

    members = (await bob.get(f"/chats/{chat_id}/members")).json()
    assert {m["user"]["id"]: m["role"] for m in members} == {bob.user_id: "owner", carol.user_id: "member"}

    # admin removes a member, then owner deletes the chat
    assert (await bob.delete(f"/chats/{chat_id}/members/{carol.user_id}")).status_code == 204
    assert (await bob.delete(f"/chats/{chat_id}")).status_code == 204
    assert _code(await bob.get(f"/chats/{chat_id}")) == "chat_not_found"


async def test_system_messages_are_localized(alice: Account, bob: Account) -> None:
    chat_id = (await alice.post("/chats/group", json={"title": "Loc", "member_ids": [bob.user_id]})).json()["id"]
    await alice.patch(f"/chats/{chat_id}/members/{bob.user_id}", json={"role": "admin"})
    en = (await bob.get(f"/chats/{chat_id}/messages")).json()["items"]
    ru = (await bob.get(f"/chats/{chat_id}/messages", headers={"Accept-Language": "ru"})).json()["items"]
    assert [m["system_code"] for m in en] == ["member_role_changed", "chat_created"]
    assert en[0]["system_text"].endswith("to admin")
    assert ru[0]["system_text"].endswith("«администратор»")
    assert "создал(а) чат" in ru[1]["system_text"]


async def test_message_flow_statuses_and_unread(alice: Account, bob: Account, carol: Account) -> None:
    chat_id = (
        await alice.post("/chats/group", json={"title": "Flow", "member_ids": [bob.user_id, carol.user_id]})
    ).json()["id"]

    assert _code(await alice.post(f"/chats/{chat_id}/messages", json={"content": "   "})) == "empty_message"
    client_id = str(uuid4())
    sent = await alice.post(f"/chats/{chat_id}/messages", json={"content": "hello", "client_message_id": client_id})
    assert sent.status_code == 201
    message = sent.json()
    retry = await alice.post(f"/chats/{chat_id}/messages", json={"content": "hello", "client_message_id": client_id})
    assert retry.json()["id"] == message["id"]

    second = (await alice.post(f"/chats/{chat_id}/messages", json={"content": "world", "reply_to_id": message["id"]})).json()
    chats = (await bob.get("/chats")).json()["items"]
    assert next(c for c in chats if c["id"] == chat_id)["unread_count"] == 2

    statuses = (await alice.get(f"/messages/{message['id']}/statuses")).json()
    assert {s["status"] for s in statuses} == {"sent"} and len(statuses) == 2
    assert _code(await bob.get(f"/messages/{message['id']}/statuses")) == "not_message_author"

    assert (await bob.post("/messages/delivered", json={"message_ids": [message["id"]]})).status_code == 204
    assert (await bob.post(f"/chats/{chat_id}/read", json={"up_to_message_id": second["id"]})).status_code == 204
    await carol.patch("/settings", json={"read_receipts_visible": False})
    assert (await carol.post(f"/chats/{chat_id}/read", json={"up_to_message_id": message["id"]})).status_code == 204

    by_user = {s["user_id"]: s for s in (await alice.get(f"/messages/{message['id']}/statuses")).json()}
    assert by_user[bob.user_id]["status"] == "read" and by_user[bob.user_id]["read_at"]
    # carol hides read receipts: she is shown as delivered only
    assert by_user[carol.user_id]["status"] == "delivered" and by_user[carol.user_id]["read_at"] is None

    chats = (await bob.get("/chats")).json()["items"]
    assert next(c for c in chats if c["id"] == chat_id)["unread_count"] == 0

    # edit / delete rules
    assert _code(await bob.patch(f"/messages/{message['id']}", json={"content": "hack"})) == "not_message_author"
    edited = await alice.patch(f"/messages/{message['id']}", json={"content": "hello!"})
    assert edited.json()["content"] == "hello!" and edited.json()["edited_at"]
    assert (await alice.delete(f"/messages/{message['id']}")).status_code == 204
    assert _code(await alice.delete(f"/messages/{message['id']}")) == "message_already_deleted"

    history = (await bob.get(f"/chats/{chat_id}/messages", params={"limit": 2})).json()
    assert [m["id"] for m in history["items"]] == [second["id"], message["id"]]
    assert history["items"][1]["is_deleted"] is True and history["items"][1]["content"] is None
    older = (await bob.get(f"/chats/{chat_id}/messages", params={"limit": 2, "cursor": history["next_cursor"]})).json()
    assert [m["system_code"] for m in older["items"]] == ["chat_created"]
    assert older["next_cursor"] is None


async def test_non_member_cannot_read_or_write(alice: Account, bob: Account, carol: Account) -> None:
    chat_id = (await alice.post("/chats/direct", json={"user_id": bob.user_id})).json()["id"]
    assert _code(await carol.get(f"/chats/{chat_id}/messages")) == "not_chat_member"
    assert _code(await carol.post(f"/chats/{chat_id}/messages", json={"content": "hi"})) == "not_chat_member"
    assert _code(await alice.post(f"/chats/{chat_id}/messages", json={"media_ids": [str(uuid4())]})) == "media_not_attachable"
