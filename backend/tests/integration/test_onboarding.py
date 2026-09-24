from httpx import AsyncClient

from app.seed.users.system_bots import GUIDE_BOT, WELCOME_BOT
from tests.integration.conftest import register


async def test_registration_creates_onboarding_chats(client: AsyncClient) -> None:
    account = await register(client, "onboarding-device")
    chats = (await account.get("/chats")).json()
    peer_ids = {item["peer"]["id"] for item in chats["items"] if item["peer"] is not None}
    assert peer_ids == {str(WELCOME_BOT.id), str(GUIDE_BOT.id)}

    welcome_chat = next(c for c in chats["items"] if c["peer"]["id"] == str(WELCOME_BOT.id))
    guide_chat = next(c for c in chats["items"] if c["peer"]["id"] == str(GUIDE_BOT.id))

    welcome_messages = (await account.get(f"/chats/{welcome_chat['id']}/messages")).json()
    guide_messages = (await account.get(f"/chats/{guide_chat['id']}/messages")).json()

    assert welcome_messages["items"][0]["sender_id"] == str(WELCOME_BOT.id)
    assert guide_messages["items"][0]["sender_id"] == str(GUIDE_BOT.id)
    assert welcome_messages["items"][0]["content"]
    assert guide_messages["items"][0]["content"]
