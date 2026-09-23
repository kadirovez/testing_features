import json

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import SessionFactory
from app.core.exceptions import AppError
from app.core.i18n.types import ErrorDefinition
from app.modules.auth import service as auth_service
from app.modules.messages import service as messages_service
from app.modules.realtime import service as realtime_service
from app.modules.realtime.connection_manager import Connection
from app.modules.realtime.schemas import (
    INCOMING_EVENT_TYPES,
    IncomingEvent,
    MessageDeliveredEvent,
    MessageReadEvent,
    OutgoingEvent,
    PingEvent,
    TypingStartEvent,
    TypingStopEvent,
    WSEventType,
    incoming_event_adapter,
)
from app.seed.errors.realtime import EVENT_PAYLOAD_INVALID, EVENT_RATE_LIMIT_EXCEEDED, EVENT_TYPE_UNKNOWN


def _classify_invalid(raw: str) -> ErrorDefinition:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return EVENT_PAYLOAD_INVALID
    if isinstance(data, dict) and data.get("type") in INCOMING_EVENT_TYPES:
        return EVENT_PAYLOAD_INVALID
    return EVENT_TYPE_UNKNOWN


async def _route(db: AsyncSession, connection: Connection, event: IncomingEvent) -> None:
    match event:
        case PingEvent():
            await realtime_service.send_event(connection, OutgoingEvent(type=WSEventType.PONG))
        case TypingStartEvent():
            await realtime_service.handle_typing(db, connection, event.payload.chat_id, is_typing=True)
        case TypingStopEvent():
            await realtime_service.handle_typing(db, connection, event.payload.chat_id, is_typing=False)
        case MessageDeliveredEvent():
            await messages_service.mark_delivered(db, connection.user_id, event.payload.message_ids)
        case MessageReadEvent():
            await messages_service.mark_read_up_to(
                db, connection.user_id, event.payload.chat_id, event.payload.up_to_message_id
            )


async def dispatch(connection: Connection, raw: str) -> None:
    """Validate, rate-limit and route one incoming WebSocket event."""
    # connection exceeded its incoming event budget
    if not connection.allow_event():
        await realtime_service.send_error(connection, EVENT_RATE_LIMIT_EXCEEDED)
        return

    try:
        event = incoming_event_adapter.validate_json(raw)
    except ValidationError:
        await realtime_service.send_error(connection, _classify_invalid(raw))
        return

    async with SessionFactory() as db:
        # session was revoked while the socket stayed open
        if not await auth_service.is_session_active(db, connection.session_id):
            await realtime_service.close_revoked(connection)
            return

        await realtime_service.refresh_presence(connection)
        try:
            await _route(db, connection, event)
        except AppError as exc:
            await realtime_service.send_error(connection, exc.error, exc.params)
