from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.i18n.types import Locale
from app.modules.chats import service as chats_service
from app.modules.messages import service as messages_service
from app.modules.messages.schemas import MessageCreate
from app.seed.messages.onboarding import GUIDE_MESSAGE, WELCOME_MESSAGE
from app.seed.users.system_bots import GUIDE_BOT, WELCOME_BOT


async def setup_for_new_user(db: AsyncSession, user_id: UUID, locale: str) -> None:
    """Open onboarding direct chats with system bots and send their first messages."""
    welcome_chat = await chats_service.ensure_direct_chat(db, user_id, WELCOME_BOT.id, created_by=WELCOME_BOT.id)
    await messages_service.send_message(
        db,
        welcome_chat.id,
        WELCOME_BOT.id,
        MessageCreate(content=WELCOME_MESSAGE.localize(locale)),
        Locale.EN.value,
    )

    guide_chat = await chats_service.ensure_direct_chat(db, user_id, GUIDE_BOT.id, created_by=GUIDE_BOT.id)
    await messages_service.send_message(
        db,
        guide_chat.id,
        GUIDE_BOT.id,
        MessageCreate(content=GUIDE_MESSAGE.localize(locale)),
        Locale.EN.value,
    )
