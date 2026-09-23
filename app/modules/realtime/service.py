import json
import logging
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import WebSocket, WebSocketDisconnect
from redis.exceptions import RedisError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.websockets import WebSocketState

from app.core.database import SessionFactory
from app.core.exceptions import AppError
from app.core.i18n.locale import get_locale, resolve_locale
from app.core.i18n.types import ErrorDefinition
from app.core.redis import get_redis
from app.modules.auth import service as auth_service
from app.modules.chats import service as chats_service
from app.modules.messages import service as messages_service
from app.modules.realtime import cache as presence_cache
from app.modules.realtime import dispatcher
from app.modules.realtime.connection_manager import Connection, manager
from app.modules.realtime.pubsub import SESSION_REVOKED_CHANNEL, listener, user_channel
from app.modules.realtime.schemas import (
    ErrorPayload,
    OutgoingEvent,
    PresencePayload,
    SessionRevokedPayload,
    TypingPayload,
    WSEventType,
)
from app.modules.settings import service as settings_service
from app.modules.users import service as users_service
from app.seed.errors.realtime import WS_SESSION_REVOKED, WS_UNAUTHORIZED

logger = logging.getLogger(__name__)

_LOCALIZED_MESSAGE_EVENTS = {WSEventType.MESSAGE_NEW.value, WSEventType.MESSAGE_UPDATED.value}
_SEND_ERRORS = (WebSocketDisconnect, RuntimeError, OSError)


def _extract_token(websocket: WebSocket, query_token: str | None) -> str | None:
    scheme, _, token = websocket.headers.get("authorization", "").partition(" ")
    if scheme.lower() == "bearer" and token:
        return token
    return query_token


def _localize(raw: str, locale: str) -> str:
    """Re-render locale-dependent parts (system message texts) of a serialized event."""
    data: dict[str, Any] = json.loads(raw)
    message = data.get("payload", {}).get("message") if data.get("type") in _LOCALIZED_MESSAGE_EVENTS else None
    if not message or not message.get("system_code"):
        return raw
    message["system_text"] = messages_service.render_system_text(
        message["system_code"], message.get("system_payload"), locale
    )
    return json.dumps(data)


async def _send_text(connection: Connection, text: str) -> None:
    if connection.websocket.application_state != WebSocketState.CONNECTED:
        return
    try:
        await connection.websocket.send_text(text)
    except _SEND_ERRORS:
        logger.debug("Dropping event for closed connection %s", connection.id)


async def _close(connection: Connection, error: ErrorDefinition) -> None:
    if connection.websocket.application_state != WebSocketState.CONNECTED:
        return
    try:
        await connection.websocket.close(code=error.status_code, reason=error.localize(connection.locale))
    except _SEND_ERRORS:
        logger.debug("Connection %s already closed", connection.id)


async def send_event(connection: Connection, event: OutgoingEvent) -> None:
    """Send an event directly to one local connection."""
    await _send_text(connection, _localize(event.model_dump_json(), connection.locale))


async def send_error(connection: Connection, error: ErrorDefinition, params: dict[str, Any] | None = None) -> None:
    """Send a localized `error` event without closing the connection."""
    payload = ErrorPayload(code=error.code, message=error.localize(connection.locale, params))
    await send_event(connection, OutgoingEvent(type=WSEventType.ERROR, payload=payload))


async def publish_to_users(user_ids: Sequence[UUID], event: OutgoingEvent) -> None:
    """Fan an event out to all connections of the users on every instance via Redis pub/sub."""
    if not user_ids:
        return
    data = event.model_dump_json()
    try:
        async with get_redis().pipeline(transaction=False) as pipe:
            for user_id in set(user_ids):
                pipe.publish(user_channel(user_id), data)
            await pipe.execute()
    except RedisError:
        logger.warning("Failed to publish %s event", event.type)


async def notify_session_revoked(session_id: UUID) -> None:
    """Broadcast a session revocation so every instance drops that session's connections."""
    try:
        await get_redis().publish(SESSION_REVOKED_CHANNEL, str(session_id))
    except RedisError:
        logger.warning("Failed to publish revocation of session %s", session_id)


async def deliver_local(user_id: UUID, raw_event: str) -> None:
    """Deliver a pub/sub event to the user's connections on this instance."""
    for connection in manager.for_user(user_id):
        await _send_text(connection, _localize(raw_event, connection.locale))


async def close_revoked(connection: Connection) -> None:
    """Notify a connection that its session was revoked and close it."""
    await send_event(
        connection,
        OutgoingEvent(type=WSEventType.SESSION_REVOKED, payload=SessionRevokedPayload(session_id=connection.session_id)),
    )
    await _close(connection, WS_SESSION_REVOKED)


async def handle_session_revoked(session_id: UUID) -> None:
    """Close every local connection bound to a revoked session."""
    for connection in manager.for_session(session_id):
        await close_revoked(connection)


async def refresh_presence(connection: Connection) -> None:
    """Heartbeat: keep the user's presence alive."""
    await presence_cache.refresh(connection.user_id)


async def _broadcast_presence(db: AsyncSession, user_id: UUID, online: bool, last_seen_at: datetime | None) -> None:
    peers = set(await chats_service.get_chat_peer_ids(db, user_id))
    peers |= set(await users_service.get_contact_owner_ids(db, user_id))
    audience = await settings_service.filter_presence_audience(db, user_id, list(peers))
    await publish_to_users(
        list(audience),
        OutgoingEvent(
            type=WSEventType.PRESENCE,
            payload=PresencePayload(user_id=user_id, online=online, last_seen_at=last_seen_at),
        ),
    )


async def _register(connection: Connection) -> None:
    if manager.add(connection):
        await listener.subscribe_user(connection.user_id)
    live_connections = await presence_cache.add_connection(connection.user_id, connection.id)
    if live_connections == 1:
        async with SessionFactory() as db:
            await _broadcast_presence(db, connection.user_id, online=True, last_seen_at=None)


async def _unregister(connection: Connection) -> None:
    if manager.remove(connection):
        await listener.unsubscribe_user(connection.user_id)
    remaining = await presence_cache.remove_connection(connection.user_id, connection.id)
    if remaining == 0:
        async with SessionFactory() as db:
            await users_service.touch_last_seen(db, connection.user_id)
            await _broadcast_presence(db, connection.user_id, online=False, last_seen_at=datetime.now(UTC))


async def handle_typing(db: AsyncSession, connection: Connection, chat_id: UUID, is_typing: bool) -> None:
    """Relay a typing indicator to the other members of a chat."""
    await chats_service.ensure_member(db, chat_id, connection.user_id)
    recipients = [uid for uid in await chats_service.get_active_member_ids(db, chat_id) if uid != connection.user_id]
    await publish_to_users(
        recipients,
        OutgoingEvent(
            type=WSEventType.TYPING,
            payload=TypingPayload(chat_id=chat_id, user_id=connection.user_id, is_typing=is_typing),
        ),
    )


async def handle_connection(websocket: WebSocket, query_token: str | None, lang: str | None) -> None:
    """Authenticate a WebSocket, register it and pump incoming events until it closes."""
    locale = resolve_locale(lang) or get_locale(websocket)
    await websocket.accept()
    async with SessionFactory() as db:
        try:
            current = await auth_service.authenticate_access_token(db, _extract_token(websocket, query_token))
        except AppError:
            await websocket.close(code=WS_UNAUTHORIZED.status_code, reason=WS_UNAUTHORIZED.localize(locale))
            return

    connection = Connection(websocket=websocket, user_id=current.user_id, session_id=current.session_id, locale=locale)
    await _register(connection)
    try:
        while websocket.application_state == WebSocketState.CONNECTED:
            raw = await websocket.receive_text()
            await dispatcher.dispatch(connection, raw)
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        await _unregister(connection)
