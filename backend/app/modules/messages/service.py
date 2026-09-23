from collections import defaultdict
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AppError
from app.core.i18n.types import Locale, SystemMessageDefinition
from app.core.pagination import Page, decode_datetime_cursor, encode_cursor
from app.modules.chats import service as chats_service
from app.modules.chats.schemas import MemberInfo
from app.modules.media import service as media_service
from app.modules.messages import repository as message_repo
from app.modules.messages.models import DeliveryStatus, Message, MessageType
from app.modules.messages.schemas import MessageCreate, MessageRead, MessageStatusRead, MessageUpdate
from app.modules.realtime import service as realtime_service
from app.modules.realtime.schemas import (
    MessageDeletedPayload,
    MessageEventPayload,
    MessageReceiptPayload,
    OutgoingEvent,
    WSEventType,
)
from app.modules.settings import service as settings_service
from app.seed.errors.messages import (
    EMPTY_MESSAGE,
    MEDIA_NOT_ATTACHABLE,
    MESSAGE_ALREADY_DELETED,
    MESSAGE_NOT_EDITABLE,
    MESSAGE_NOT_FOUND,
    NOT_MESSAGE_AUTHOR,
    REPLY_TARGET_NOT_FOUND,
    TOO_MANY_ATTACHMENTS,
)
from app.seed.messages import system as system_texts

_SYSTEM_TEXTS: dict[str, SystemMessageDefinition] = {
    value.code: value for value in vars(system_texts).values() if isinstance(value, SystemMessageDefinition)
}


def _now() -> datetime:
    return datetime.now(UTC)


def render_system_text(code: str | None, payload: dict[str, Any] | None, locale: str) -> str | None:
    """Render a system message text for a locale from its seed code and stored payload."""
    definition = _SYSTEM_TEXTS.get(code) if code else None
    if definition is None:
        return None
    params = dict(payload or {})
    role_text = _SYSTEM_TEXTS.get(f"role_{params.get('role')}")
    if role_text is not None:
        params["role"] = role_text.localize(locale)
    try:
        return definition.localize(locale, params)
    except KeyError:
        return definition.message.get(locale)


async def _render(db: AsyncSession, messages: Sequence[Message], locale: str) -> list[MessageRead]:
    attachment_ids = await message_repo.list_attachment_media_ids(db, [m.id for m in messages if m.deleted_at is None])
    media = await media_service.get_media_briefs(db, [mid for ids in attachment_ids.values() for mid in ids])
    result: list[MessageRead] = []
    for message in messages:
        deleted = message.deleted_at is not None
        result.append(
            MessageRead(
                id=message.id,
                chat_id=message.chat_id,
                sender_id=message.sender_id,
                type=message.type,
                content=None if deleted else message.content,
                system_code=message.system_code,
                system_payload=message.system_payload,
                system_text=render_system_text(message.system_code, message.system_payload, locale),
                reply_to_id=message.reply_to_id,
                client_message_id=message.client_message_id,
                attachments=[media[mid] for mid in attachment_ids.get(message.id, []) if mid in media],
                created_at=message.created_at,
                edited_at=message.edited_at,
                deleted_at=message.deleted_at,
                is_deleted=deleted,
            )
        )
    return result


async def _render_one(db: AsyncSession, message: Message, locale: str) -> MessageRead:
    return (await _render(db, [message], locale))[0]


async def _publish_message_event(db: AsyncSession, event_type: WSEventType, message: Message) -> None:
    rendered = await _render_one(db, message, Locale.EN.value)
    recipients = await chats_service.get_active_member_ids(db, message.chat_id)
    await realtime_service.publish_to_users(
        recipients, OutgoingEvent(type=event_type, payload=MessageEventPayload(message=rendered))
    )


async def _get_visible_message(db: AsyncSession, user_id: UUID, message_id: UUID) -> tuple[Message, MemberInfo]:
    message = await message_repo.get_by_id(db, message_id)
    # message does not exist
    if message is None:
        raise AppError(MESSAGE_NOT_FOUND)

    member = await chats_service.ensure_member(db, message.chat_id, user_id)
    return message, member


async def send_message(
    db: AsyncSession, chat_id: UUID, sender_id: UUID, data: MessageCreate, locale: str
) -> MessageRead:
    """Send a text and/or media message to a chat and fan it out to members."""
    await chats_service.ensure_member(db, chat_id, sender_id)
    if data.client_message_id is not None:
        existing = await message_repo.get_by_client_id(db, sender_id, data.client_message_id)
        if existing is not None:
            return await _render_one(db, existing, locale)

    content = data.content.strip() if data.content else None
    media_ids = list(dict.fromkeys(data.media_ids))
    # message has neither text nor attachments
    if not content and not media_ids:
        raise AppError(EMPTY_MESSAGE)

    # attachment count exceeds the limit
    if len(media_ids) > settings.MESSAGE_MAX_ATTACHMENTS:
        raise AppError(TOO_MANY_ATTACHMENTS)

    if data.reply_to_id is not None:
        reply_target = await message_repo.get_by_id(db, data.reply_to_id)
        # replied message is missing or belongs to another chat
        if reply_target is None or reply_target.chat_id != chat_id:
            raise AppError(REPLY_TARGET_NOT_FOUND)

    media = await media_service.get_attachable_media(db, media_ids, sender_id)
    # some media are missing, foreign, not uploaded or not meant for messages
    if len(media) != len(media_ids):
        raise AppError(MEDIA_NOT_ATTACHABLE)

    # some media are already attached to another message
    if await message_repo.any_media_attached(db, media_ids):
        raise AppError(MEDIA_NOT_ATTACHABLE)

    # media kinds share their values with the photo/video message types
    kinds = {item.kind.value for item in media}
    message_type = next(
        (candidate for candidate in (MessageType.VIDEO, MessageType.PHOTO) if candidate.value in kinds), MessageType.TEXT
    )
    message = await message_repo.create_message(
        db,
        chat_id=chat_id,
        sender_id=sender_id,
        type=message_type,
        content=content or None,
        reply_to_id=data.reply_to_id,
        client_message_id=data.client_message_id,
    )
    await message_repo.create_attachments(db, message.id, media_ids)
    member_ids = await chats_service.get_active_member_ids(db, chat_id)
    await message_repo.create_statuses(db, message.id, chat_id, [uid for uid in member_ids if uid != sender_id])
    await chats_service.touch_last_message_at(db, chat_id, message.created_at)
    await db.commit()
    await _publish_message_event(db, WSEventType.MESSAGE_NEW, message)
    return await _render_one(db, message, locale)


async def create_system_message(
    db: AsyncSession,
    chat_id: UUID,
    actor_id: UUID | None,
    definition: SystemMessageDefinition,
    payload: dict[str, Any],
) -> MessageRead:
    """Store a system message (rendered per locale on read) and fan it out to members."""
    message = await message_repo.create_message(
        db,
        chat_id=chat_id,
        sender_id=None,
        type=MessageType.SYSTEM,
        system_code=definition.code,
        system_payload={**payload, "actor_id": str(actor_id) if actor_id else None},
    )
    await chats_service.touch_last_message_at(db, chat_id, message.created_at)
    await db.commit()
    await _publish_message_event(db, WSEventType.MESSAGE_NEW, message)
    return await _render_one(db, message, Locale.EN.value)


async def list_messages(
    db: AsyncSession, user_id: UUID, chat_id: UUID, cursor: str | None, limit: int, locale: str
) -> Page[MessageRead]:
    """List chat history newest first; soft-deleted messages are returned as tombstones."""
    await chats_service.ensure_member(db, chat_id, user_id)
    before = decode_datetime_cursor(cursor) if cursor else None
    messages = await message_repo.list_messages(db, chat_id, before, limit + 1)
    has_more = len(messages) > limit
    messages = messages[:limit]
    next_cursor = encode_cursor(messages[-1].created_at, messages[-1].id) if has_more else None
    return Page(items=await _render(db, messages, locale), next_cursor=next_cursor)


async def edit_message(
    db: AsyncSession, user_id: UUID, message_id: UUID, data: MessageUpdate, locale: str
) -> MessageRead:
    """Edit the text of the user's own message."""
    message, _ = await _get_visible_message(db, user_id, message_id)
    # deleted messages cannot be edited
    if message.deleted_at is not None:
        raise AppError(MESSAGE_ALREADY_DELETED)

    # system messages have no author
    if message.type == MessageType.SYSTEM:
        raise AppError(MESSAGE_NOT_EDITABLE)

    # only the author can edit
    if message.sender_id != user_id:
        raise AppError(NOT_MESSAGE_AUTHOR)

    message = await message_repo.update_message(
        db, message_id, {"content": data.content.strip(), "edited_at": _now()}
    )
    await db.commit()
    await _publish_message_event(db, WSEventType.MESSAGE_UPDATED, message)
    return await _render_one(db, message, locale)


async def delete_message(db: AsyncSession, user_id: UUID, message_id: UUID) -> None:
    """Soft-delete a message (author, or owner/admin in group chats)."""
    message, member = await _get_visible_message(db, user_id, message_id)
    # message is already deleted
    if message.deleted_at is not None:
        raise AppError(MESSAGE_ALREADY_DELETED)

    # only the author or a group moderator can delete
    if message.sender_id != user_id and not member.can_moderate:
        raise AppError(NOT_MESSAGE_AUTHOR)

    await message_repo.update_message(db, message_id, {"deleted_at": _now()})
    await db.commit()
    recipients = await chats_service.get_active_member_ids(db, message.chat_id)
    await realtime_service.publish_to_users(
        recipients,
        OutgoingEvent(
            type=WSEventType.MESSAGE_DELETED,
            payload=MessageDeletedPayload(chat_id=message.chat_id, message_id=message_id),
        ),
    )


async def mark_delivered(db: AsyncSession, user_id: UUID, message_ids: Sequence[UUID]) -> None:
    """Mark messages as delivered to the user and notify their senders."""
    now = _now()
    changed = await message_repo.mark_delivered(db, user_id, list(set(message_ids)), now)
    await db.commit()
    if not changed:
        return
    senders = await message_repo.list_senders(db, [message_id for message_id, _ in changed])
    grouped: dict[tuple[UUID, UUID], list[UUID]] = defaultdict(list)
    for message_id, chat_id in changed:
        sender_id = senders.get(message_id)
        if sender_id is not None:
            grouped[(sender_id, chat_id)].append(message_id)
    for (sender_id, chat_id), ids in grouped.items():
        await realtime_service.publish_to_users(
            [sender_id],
            OutgoingEvent(
                type=WSEventType.MESSAGE_DELIVERED,
                payload=MessageReceiptPayload(chat_id=chat_id, user_id=user_id, message_ids=ids, at=now),
            ),
        )


async def mark_read_up_to(db: AsyncSession, user_id: UUID, chat_id: UUID, up_to_message_id: UUID) -> None:
    """Mark all messages of a chat up to the given one as read by the user."""
    await chats_service.ensure_member(db, chat_id, user_id)
    target = await message_repo.get_by_id(db, up_to_message_id)
    # target message is missing or belongs to another chat
    if target is None or target.chat_id != chat_id:
        raise AppError(MESSAGE_NOT_FOUND)

    now = _now()
    changed = await message_repo.mark_read_up_to(db, user_id, chat_id, target.created_at, now)
    await db.commit()
    if not changed:
        return
    # the reader's other devices always sync read state; senders only if read receipts are visible
    recipients = {user_id}
    if not await settings_service.get_read_receipt_hidden_user_ids(db, [user_id]):
        senders = await message_repo.list_senders(db, changed)
        recipients |= {sender_id for sender_id in senders.values() if sender_id is not None}
    await realtime_service.publish_to_users(
        list(recipients),
        OutgoingEvent(
            type=WSEventType.MESSAGE_READ,
            payload=MessageReceiptPayload(chat_id=chat_id, user_id=user_id, message_ids=changed, at=now),
        ),
    )


async def get_message_statuses(db: AsyncSession, user_id: UUID, message_id: UUID) -> list[MessageStatusRead]:
    """Return per-recipient statuses of the user's own message, honoring read-receipt privacy."""
    message, _ = await _get_visible_message(db, user_id, message_id)
    # only the author can inspect delivery statuses
    if message.sender_id != user_id:
        raise AppError(NOT_MESSAGE_AUTHOR)

    statuses = await message_repo.list_statuses(db, message_id)
    hidden = await settings_service.get_read_receipt_hidden_user_ids(db, [s.user_id for s in statuses])
    result: list[MessageStatusRead] = []
    for status in statuses:
        masked = status.user_id in hidden and status.status == DeliveryStatus.READ
        result.append(
            MessageStatusRead(
                user_id=status.user_id,
                status=DeliveryStatus.DELIVERED if masked else status.status,
                delivered_at=status.delivered_at,
                read_at=None if masked else status.read_at,
            )
        )
    return result


async def count_unread_by_chats(db: AsyncSession, user_id: UUID, chat_ids: Sequence[UUID]) -> dict[UUID, int]:
    """Return unread message counts per chat for the user."""
    return await message_repo.count_unread_by_chats(db, user_id, chat_ids)


async def can_user_access_media(db: AsyncSession, user_id: UUID, media_id: UUID) -> bool:
    """Check whether a media file is attached to a message in a chat the user belongs to."""
    chat_id = await message_repo.get_attachment_chat_id(db, media_id)
    return chat_id is not None and await chats_service.is_member(db, chat_id, user_id)
