from datetime import datetime
from enum import StrEnum
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, Field, SerializeAsAny, TypeAdapter

from app.modules.messages.schemas import MessageRead


class WSEventType(StrEnum):
    CHAT_UPDATED = "chat_updated"
    ERROR = "error"
    MEDIA_READY = "media_ready"
    MEMBER_ADDED = "member_added"
    MEMBER_REMOVED = "member_removed"
    MESSAGE_DELETED = "message_deleted"
    MESSAGE_DELIVERED = "message_delivered"
    MESSAGE_NEW = "message_new"
    MESSAGE_READ = "message_read"
    MESSAGE_UPDATED = "message_updated"
    PING = "ping"
    PONG = "pong"
    PRESENCE = "presence"
    SESSION_REVOKED = "session_revoked"
    TYPING = "typing"
    TYPING_START = "typing_start"
    TYPING_STOP = "typing_stop"


# ---- incoming (client -> server) ----


class EmptyPayload(BaseModel):
    pass


class TypingIncomingPayload(BaseModel):
    chat_id: UUID


class MessageDeliveredIncomingPayload(BaseModel):
    message_ids: list[UUID] = Field(min_length=1, max_length=100)


class MessageReadIncomingPayload(BaseModel):
    chat_id: UUID
    up_to_message_id: UUID


class PingEvent(BaseModel):
    type: Literal[WSEventType.PING]
    payload: EmptyPayload = Field(default_factory=EmptyPayload)


class TypingStartEvent(BaseModel):
    type: Literal[WSEventType.TYPING_START]
    payload: TypingIncomingPayload


class TypingStopEvent(BaseModel):
    type: Literal[WSEventType.TYPING_STOP]
    payload: TypingIncomingPayload


class MessageDeliveredEvent(BaseModel):
    type: Literal[WSEventType.MESSAGE_DELIVERED]
    payload: MessageDeliveredIncomingPayload


class MessageReadEvent(BaseModel):
    type: Literal[WSEventType.MESSAGE_READ]
    payload: MessageReadIncomingPayload


IncomingEvent = Annotated[
    PingEvent | TypingStartEvent | TypingStopEvent | MessageDeliveredEvent | MessageReadEvent,
    Field(discriminator="type"),
]
incoming_event_adapter: TypeAdapter[IncomingEvent] = TypeAdapter(IncomingEvent)
INCOMING_EVENT_TYPES = {
    WSEventType.PING,
    WSEventType.TYPING_START,
    WSEventType.TYPING_STOP,
    WSEventType.MESSAGE_DELIVERED,
    WSEventType.MESSAGE_READ,
}


# ---- outgoing (server -> client) ----


class MessageEventPayload(BaseModel):
    message: MessageRead


class MessageDeletedPayload(BaseModel):
    chat_id: UUID
    message_id: UUID


class MessageReceiptPayload(BaseModel):
    chat_id: UUID
    user_id: UUID
    message_ids: list[UUID]
    at: datetime


class TypingPayload(BaseModel):
    chat_id: UUID
    user_id: UUID
    is_typing: bool


class PresencePayload(BaseModel):
    user_id: UUID
    online: bool
    last_seen_at: datetime | None = None


class ChatEventPayload(BaseModel):
    chat_id: UUID
    deleted: bool = False


class MemberEventPayload(BaseModel):
    chat_id: UUID
    user_ids: list[UUID]


class MediaReadyPayload(BaseModel):
    media_id: UUID
    status: str


class SessionRevokedPayload(BaseModel):
    session_id: UUID


class ErrorPayload(BaseModel):
    code: str
    message: str


class OutgoingEvent(BaseModel):
    type: WSEventType
    payload: SerializeAsAny[BaseModel] = Field(default_factory=EmptyPayload)
