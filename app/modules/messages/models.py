from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from sqlalchemy import ForeignKey, Index, SmallInteger, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, UUIDPkMixin, str_enum


class MessageType(StrEnum):
    TEXT = "text"
    PHOTO = "photo"
    VIDEO = "video"
    SYSTEM = "system"


class DeliveryStatus(StrEnum):
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Message(UUIDPkMixin, Base):
    __tablename__ = "messages"
    __table_args__ = (UniqueConstraint("sender_id", "client_message_id"),)

    chat_id: Mapped[UUID] = mapped_column(ForeignKey("chats.id", ondelete="CASCADE"))
    sender_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    type: Mapped[MessageType] = mapped_column(str_enum(MessageType, "message_type"))
    content: Mapped[str | None] = mapped_column(Text)
    system_code: Mapped[str | None] = mapped_column(String(64))
    system_payload: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    reply_to_id: Mapped[UUID | None] = mapped_column(ForeignKey("messages.id", ondelete="SET NULL"), index=True)
    client_message_id: Mapped[UUID | None]
    # Application-side timestamp: rows inserted in one transaction must still be strictly ordered.
    created_at: Mapped[datetime] = mapped_column(default=_utcnow)
    edited_at: Mapped[datetime | None]
    deleted_at: Mapped[datetime | None]


Index("ix_messages_chat_id_created_at_id", Message.chat_id, Message.created_at.desc(), Message.id.desc())


class MessageStatus(UUIDPkMixin, Base):
    __tablename__ = "message_statuses"
    __table_args__ = (
        UniqueConstraint("message_id", "user_id"),
        Index("ix_message_statuses_user_chat_unread", "user_id", "chat_id", postgresql_where=text("status <> 'read'")),
        Index("ix_message_statuses_user_undelivered", "user_id", postgresql_where=text("status = 'sent'")),
    )

    message_id: Mapped[UUID] = mapped_column(ForeignKey("messages.id", ondelete="CASCADE"))
    chat_id: Mapped[UUID] = mapped_column(ForeignKey("chats.id", ondelete="CASCADE"))
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    status: Mapped[DeliveryStatus] = mapped_column(
        str_enum(DeliveryStatus, "delivery_status"), default=DeliveryStatus.SENT
    )
    delivered_at: Mapped[datetime | None]
    read_at: Mapped[datetime | None]


class MessageAttachment(UUIDPkMixin, Base):
    __tablename__ = "message_attachments"
    __table_args__ = (Index("ix_message_attachments_message_id_position", "message_id", "position"),)

    message_id: Mapped[UUID] = mapped_column(ForeignKey("messages.id", ondelete="CASCADE"))
    media_id: Mapped[UUID] = mapped_column(ForeignKey("media_files.id", ondelete="RESTRICT"), unique=True)
    position: Mapped[int] = mapped_column(SmallInteger, default=0)
