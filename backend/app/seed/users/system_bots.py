from dataclasses import dataclass
from uuid import UUID

WELCOME_BOT_ID = UUID("a1000000-0000-4000-8000-000000000001")
GUIDE_BOT_ID = UUID("a1000000-0000-4000-8000-000000000002")


@dataclass(frozen=True)
class SystemBotSeed:
    """Fixed identity of a built-in bot account."""

    id: UUID
    email: str
    username: str
    display_name: str


WELCOME_BOT = SystemBotSeed(
    id=WELCOME_BOT_ID,
    email="welcome@messenger.local",
    username="sys_welcome",
    display_name="Welcome ⭐️",
)

GUIDE_BOT = SystemBotSeed(
    id=GUIDE_BOT_ID,
    email="guide@messenger.local",
    username="sys_guide",
    display_name="System Guide 📒",
)

SYSTEM_BOTS: tuple[SystemBotSeed, ...] = (WELCOME_BOT, GUIDE_BOT)
