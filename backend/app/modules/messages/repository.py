from collections import defaultdict
from collections.abc import Sequence
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import delete, func, insert, or_, select, tuple_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.chats.models import ChatMember
from app.modules.messages.models import DeliveryStatus, Message, MessageAttachment, MessageStatus


async def create_message(db: AsyncSession, **values: Any) -> Message:
    """Insert a message row."""
    message = Message(**values)
    db.add(message)
    await db.flush()
    await db.refresh(message)
    return message


async def get_by_id(db: AsyncSession, message_id: UUID) -> Message | None:
    """Fetch a message by id (including soft-deleted ones)."""
    result = await db.execute(select(Message).where(Message.id == message_id))
    return result.scalar_one_or_none()


async def get_by_client_id(db: AsyncSession, sender_id: UUID, client_message_id: UUID) -> Message | None:
    """Fetch a message by the sender's idempotency key."""
    result = await db.execute(
        select(Message).where(Message.sender_id == sender_id, Message.client_message_id == client_message_id)
    )
    return result.scalar_one_or_none()


async def delete_all_in_chat(db: AsyncSession, chat_id: UUID) -> None:
    """Hard-delete every message in a chat (statuses and attachments cascade)."""
    await db.execute(delete(Message).where(Message.chat_id == chat_id))


async def update_message(db: AsyncSession, message_id: UUID, values: dict[str, Any]) -> Message:
    """Update message columns and return the refreshed row."""
    await db.execute(update(Message).where(Message.id == message_id).values(**values))
    result = await db.execute(
        select(Message).where(Message.id == message_id).execution_options(populate_existing=True)
    )
    return result.scalar_one()


async def list_messages(
    db: AsyncSession,
    chat_id: UUID,
    before: tuple[datetime, UUID] | None,
    limit: int,
    *,
    visible_after: datetime | None = None,
) -> list[Message]:
    """List chat messages newest first, keyset-paginated by (created_at, id)."""
    stmt = select(Message).where(Message.chat_id == chat_id)
    if visible_after is not None:
        stmt = stmt.where(Message.created_at > visible_after)
    if before is not None:
        stmt = stmt.where(tuple_(Message.created_at, Message.id) < tuple_(before[0], before[1]))
    stmt = stmt.order_by(Message.created_at.desc(), Message.id.desc()).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars())


async def create_attachments(db: AsyncSession, message_id: UUID, media_ids: Sequence[UUID]) -> None:
    """Link media files to a message preserving their order."""
    if not media_ids:
        return
    await db.execute(
        insert(MessageAttachment),
        [{"message_id": message_id, "media_id": media_id, "position": index} for index, media_id in enumerate(media_ids)],
    )


async def list_attachment_media_ids(db: AsyncSession, message_ids: Sequence[UUID]) -> dict[UUID, list[UUID]]:
    """Return ordered media ids attached to each message."""
    if not message_ids:
        return {}
    result = await db.execute(
        select(MessageAttachment.message_id, MessageAttachment.media_id)
        .where(MessageAttachment.message_id.in_(message_ids))
        .order_by(MessageAttachment.message_id, MessageAttachment.position)
    )
    grouped: dict[UUID, list[UUID]] = defaultdict(list)
    for message_id, media_id in result.all():
        grouped[message_id].append(media_id)
    return grouped


async def any_media_attached(db: AsyncSession, media_ids: Sequence[UUID]) -> bool:
    """Check whether any of the media files is already attached to a message."""
    if not media_ids:
        return False
    result = await db.execute(select(MessageAttachment.id).where(MessageAttachment.media_id.in_(media_ids)).limit(1))
    return result.first() is not None


async def get_attachment_chat_id(db: AsyncSession, media_id: UUID) -> UUID | None:
    """Return the chat of the non-deleted message a media file is attached to."""
    result = await db.execute(
        select(Message.chat_id)
        .join(MessageAttachment, MessageAttachment.message_id == Message.id)
        .where(MessageAttachment.media_id == media_id, Message.deleted_at.is_(None))
    )
    return result.scalar_one_or_none()


async def create_statuses(db: AsyncSession, message_id: UUID, chat_id: UUID, user_ids: Sequence[UUID]) -> None:
    """Create per-recipient delivery statuses for a new message."""
    if not user_ids:
        return
    await db.execute(
        insert(MessageStatus),
        [
            {"message_id": message_id, "chat_id": chat_id, "user_id": user_id, "status": DeliveryStatus.SENT}
            for user_id in user_ids
        ],
    )


async def mark_delivered(
    db: AsyncSession, user_id: UUID, message_ids: Sequence[UUID], at: datetime
) -> list[tuple[UUID, UUID]]:
    """Mark `sent` statuses as delivered; returns (message_id, chat_id) of changed rows."""
    result = await db.execute(
        update(MessageStatus)
        .where(
            MessageStatus.user_id == user_id,
            MessageStatus.message_id.in_(message_ids),
            MessageStatus.status == DeliveryStatus.SENT,
        )
        .values(status=DeliveryStatus.DELIVERED, delivered_at=at)
        .returning(MessageStatus.message_id, MessageStatus.chat_id)
    )
    return [(row[0], row[1]) for row in result.all()]


async def mark_read_up_to(
    db: AsyncSession, user_id: UUID, chat_id: UUID, up_to_created_at: datetime, at: datetime
) -> list[UUID]:
    """Mark all unread statuses of the user in a chat up to a point in time as read."""
    result = await db.execute(
        update(MessageStatus)
        .where(
            MessageStatus.user_id == user_id,
            MessageStatus.chat_id == chat_id,
            MessageStatus.status != DeliveryStatus.READ,
            MessageStatus.message_id == Message.id,
            Message.created_at <= up_to_created_at,
        )
        .values(
            status=DeliveryStatus.READ,
            read_at=at,
            delivered_at=func.coalesce(MessageStatus.delivered_at, at),
        )
        .returning(MessageStatus.message_id)
        .execution_options(synchronize_session=False)
    )
    return list(result.scalars())


async def list_senders(db: AsyncSession, message_ids: Sequence[UUID]) -> dict[UUID, UUID | None]:
    """Return the sender of each message."""
    if not message_ids:
        return {}
    result = await db.execute(select(Message.id, Message.sender_id).where(Message.id.in_(message_ids)))
    return {row[0]: row[1] for row in result.all()}


async def list_statuses(db: AsyncSession, message_id: UUID) -> list[MessageStatus]:
    """List recipient statuses of a message."""
    result = await db.execute(
        select(MessageStatus).where(MessageStatus.message_id == message_id).order_by(MessageStatus.user_id)
    )
    return list(result.scalars())


async def count_unread_by_chats(db: AsyncSession, user_id: UUID, chat_ids: Sequence[UUID]) -> dict[UUID, int]:
    """Count unread, non-deleted messages of the user per chat."""
    if not chat_ids:
        return {}
    result = await db.execute(
        select(MessageStatus.chat_id, func.count(func.distinct(MessageStatus.message_id)))
        .join(Message, Message.id == MessageStatus.message_id)
        .join(
            ChatMember,
            (ChatMember.chat_id == MessageStatus.chat_id) & (ChatMember.user_id == user_id),
        )
        .where(
            MessageStatus.user_id == user_id,
            MessageStatus.chat_id.in_(chat_ids),
            MessageStatus.status != DeliveryStatus.READ,
            Message.deleted_at.is_(None),
            ChatMember.left_at.is_(None),
            or_(ChatMember.history_cleared_at.is_(None), Message.created_at > ChatMember.history_cleared_at),
        )
        .group_by(MessageStatus.chat_id)
    )
    return {row[0]: int(row[1]) for row in result.all()}
