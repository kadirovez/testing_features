from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.config import settings
from app.modules.media.schemas import MediaBrief
from app.modules.messages.models import DeliveryStatus, MessageType


class MessageCreate(BaseModel):
    content: str | None = Field(default=None, max_length=settings.MESSAGE_MAX_LENGTH)
    media_ids: list[UUID] = Field(default_factory=list)
    reply_to_id: UUID | None = None
    client_message_id: UUID | None = None


class MessageUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=settings.MESSAGE_MAX_LENGTH)


class MessageRead(BaseModel):
    id: UUID
    chat_id: UUID
    sender_id: UUID | None
    type: MessageType
    content: str | None
    system_code: str | None = None
    system_payload: dict[str, Any] | None = None
    system_text: str | None = None
    reply_to_id: UUID | None
    client_message_id: UUID | None
    attachments: list[MediaBrief] = Field(default_factory=list)
    created_at: datetime
    edited_at: datetime | None
    deleted_at: datetime | None
    is_deleted: bool = False


class MessageStatusRead(BaseModel):
    user_id: UUID
    status: DeliveryStatus
    delivered_at: datetime | None
    read_at: datetime | None


class ReadRequest(BaseModel):
    up_to_message_id: UUID


class DeliveredRequest(BaseModel):
    message_ids: list[UUID] = Field(min_length=1, max_length=100)
