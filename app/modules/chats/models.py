from datetime import datetime
from enum import StrEnum
from uuid import UUID

from sqlalchemy import ForeignKey, Index, String, Text, UniqueConstraint, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, UUIDPkMixin, str_enum


class ChatType(StrEnum):
    DIRECT = "direct"
    GROUP = "group"


class ChatRole(StrEnum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"


class Chat(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "chats"

    type: Mapped[ChatType] = mapped_column(str_enum(ChatType, "chat_type"))
    title: Mapped[str | None] = mapped_column(String(128))
    description: Mapped[str | None] = mapped_column(Text)
    avatar_media_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("media_files.id", ondelete="SET NULL", use_alter=True)
    )
    created_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    direct_key: Mapped[str | None] = mapped_column(String(80), unique=True)
    last_message_at: Mapped[datetime] = mapped_column(server_default=func.now())
    deleted_at: Mapped[datetime | None]


Index("ix_chats_last_message_at_id", Chat.last_message_at.desc(), Chat.id.desc())


class ChatMember(UUIDPkMixin, Base):
    __tablename__ = "chat_members"
    __table_args__ = (
        UniqueConstraint("chat_id", "user_id"),
        Index("ix_chat_members_user_id_active", "user_id", postgresql_where=text("left_at IS NULL")),
        Index("ix_chat_members_chat_id_active", "chat_id", postgresql_where=text("left_at IS NULL")),
    )

    chat_id: Mapped[UUID] = mapped_column(ForeignKey("chats.id", ondelete="CASCADE"))
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    role: Mapped[ChatRole] = mapped_column(str_enum(ChatRole, "chat_role"), default=ChatRole.MEMBER)
    muted_until: Mapped[datetime | None]
    joined_at: Mapped[datetime] = mapped_column(server_default=func.now())
    left_at: Mapped[datetime | None]
