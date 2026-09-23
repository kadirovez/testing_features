from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from sqlalchemy import ForeignKey, String, func, text, true
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, str_enum


class OnlineStatusVisibility(StrEnum):
    EVERYONE = "everyone"
    CONTACTS = "contacts"
    NOBODY = "nobody"


class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    notifications_enabled: Mapped[bool] = mapped_column(default=True, server_default=true())
    notification_preview: Mapped[bool] = mapped_column(default=True, server_default=true())
    read_receipts_visible: Mapped[bool] = mapped_column(default=True, server_default=true())
    online_status_visibility: Mapped[OnlineStatusVisibility] = mapped_column(
        str_enum(OnlineStatusVisibility, "online_status_visibility"),
        default=OnlineStatusVisibility.EVERYONE,
        server_default=OnlineStatusVisibility.EVERYONE.value,
    )
    language: Mapped[str] = mapped_column(String(8), default="en", server_default="en")
    theme: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default=text("'{}'::jsonb"))
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
