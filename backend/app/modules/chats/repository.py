from collections.abc import Sequence
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, select, tuple_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.chats.models import Chat, ChatMember, ChatRole


async def create_chat(db: AsyncSession, **values: Any) -> Chat:
    """Insert a chat row."""
    chat = Chat(**values)
    db.add(chat)
    await db.flush()
    await db.refresh(chat)
    return chat


async def get_by_id(db: AsyncSession, chat_id: UUID) -> Chat | None:
    """Fetch a non-deleted chat by id."""
    result = await db.execute(select(Chat).where(Chat.id == chat_id, Chat.deleted_at.is_(None)))
    return result.scalar_one_or_none()


async def get_by_direct_key(db: AsyncSession, direct_key: str) -> Chat | None:
    """Fetch a direct chat by its sorted participant key."""
    result = await db.execute(select(Chat).where(Chat.direct_key == direct_key, Chat.deleted_at.is_(None)))
    return result.scalar_one_or_none()


async def update_chat(db: AsyncSession, chat_id: UUID, values: dict[str, Any]) -> Chat:
    """Update chat columns and return the refreshed row."""
    await db.execute(update(Chat).where(Chat.id == chat_id).values(**values))
    result = await db.execute(select(Chat).where(Chat.id == chat_id).execution_options(populate_existing=True))
    return result.scalar_one()


async def add_members(db: AsyncSession, chat_id: UUID, members: Sequence[tuple[UUID, ChatRole]]) -> None:
    """Insert several membership rows."""
    db.add_all([ChatMember(chat_id=chat_id, user_id=user_id, role=role) for user_id, role in members])
    await db.flush()


async def add_member(db: AsyncSession, chat_id: UUID, user_id: UUID, role: ChatRole) -> ChatMember:
    """Insert one membership row."""
    member = ChatMember(chat_id=chat_id, user_id=user_id, role=role)
    db.add(member)
    await db.flush()
    await db.refresh(member)
    return member


async def get_member(db: AsyncSession, chat_id: UUID, user_id: UUID) -> ChatMember | None:
    """Fetch an active membership."""
    result = await db.execute(
        select(ChatMember).where(
            ChatMember.chat_id == chat_id, ChatMember.user_id == user_id, ChatMember.left_at.is_(None)
        )
    )
    return result.scalar_one_or_none()


async def get_member_any_state(db: AsyncSession, chat_id: UUID, user_id: UUID) -> ChatMember | None:
    """Fetch a membership row including ones that have left."""
    result = await db.execute(
        select(ChatMember).where(ChatMember.chat_id == chat_id, ChatMember.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def update_member(db: AsyncSession, member_id: UUID, values: dict[str, Any]) -> ChatMember:
    """Update membership columns and return the refreshed row."""
    await db.execute(update(ChatMember).where(ChatMember.id == member_id).values(**values))
    result = await db.execute(
        select(ChatMember).where(ChatMember.id == member_id).execution_options(populate_existing=True)
    )
    return result.scalar_one()


async def list_active_members(db: AsyncSession, chat_id: UUID) -> list[ChatMember]:
    """List active memberships of a chat in join order."""
    result = await db.execute(
        select(ChatMember)
        .where(ChatMember.chat_id == chat_id, ChatMember.left_at.is_(None))
        .order_by(ChatMember.joined_at, ChatMember.id)
    )
    return list(result.scalars())


async def list_active_member_ids(db: AsyncSession, chat_id: UUID) -> list[UUID]:
    """List user ids of active chat members."""
    result = await db.execute(
        select(ChatMember.user_id).where(ChatMember.chat_id == chat_id, ChatMember.left_at.is_(None))
    )
    return list(result.scalars())


async def count_active_members(db: AsyncSession, chat_id: UUID) -> int:
    """Count active members of a chat."""
    result = await db.execute(
        select(func.count()).select_from(ChatMember).where(ChatMember.chat_id == chat_id, ChatMember.left_at.is_(None))
    )
    return int(result.scalar_one())


async def list_user_chats(
    db: AsyncSession, user_id: UUID, after: tuple[datetime, UUID] | None, limit: int
) -> list[tuple[Chat, ChatMember]]:
    """List chats of a user with their membership, most recently active first."""
    stmt = (
        select(Chat, ChatMember)
        .join(ChatMember, ChatMember.chat_id == Chat.id)
        .where(ChatMember.user_id == user_id, ChatMember.left_at.is_(None), Chat.deleted_at.is_(None))
    )
    if after is not None:
        stmt = stmt.where(tuple_(Chat.last_message_at, Chat.id) < tuple_(after[0], after[1]))
    stmt = stmt.order_by(Chat.last_message_at.desc(), Chat.id.desc()).limit(limit)
    result = await db.execute(stmt)
    return [(row[0], row[1]) for row in result.all()]


async def list_other_member_ids(db: AsyncSession, chat_ids: Sequence[UUID], user_id: UUID) -> list[tuple[UUID, UUID]]:
    """Return (chat_id, user_id) pairs of active members other than `user_id`."""
    if not chat_ids:
        return []
    result = await db.execute(
        select(ChatMember.chat_id, ChatMember.user_id).where(
            ChatMember.chat_id.in_(chat_ids), ChatMember.user_id != user_id, ChatMember.left_at.is_(None)
        )
    )
    return [(row[0], row[1]) for row in result.all()]


async def list_user_chat_ids(db: AsyncSession, user_id: UUID) -> list[UUID]:
    """List ids of non-deleted chats where the user is an active member."""
    result = await db.execute(
        select(ChatMember.chat_id)
        .join(Chat, Chat.id == ChatMember.chat_id)
        .where(ChatMember.user_id == user_id, ChatMember.left_at.is_(None), Chat.deleted_at.is_(None))
    )
    return list(result.scalars())


async def list_peer_ids(db: AsyncSession, user_id: UUID) -> list[UUID]:
    """List distinct users sharing at least one active chat with the user."""
    own_chats = (
        select(ChatMember.chat_id)
        .join(Chat, Chat.id == ChatMember.chat_id)
        .where(ChatMember.user_id == user_id, ChatMember.left_at.is_(None), Chat.deleted_at.is_(None))
    )
    result = await db.execute(
        select(ChatMember.user_id)
        .where(ChatMember.chat_id.in_(own_chats), ChatMember.user_id != user_id, ChatMember.left_at.is_(None))
        .distinct()
    )
    return list(result.scalars())


async def set_last_message_at(db: AsyncSession, chat_id: UUID, at: datetime) -> None:
    """Move the chat's activity timestamp forward."""
    await db.execute(
        update(Chat).where(Chat.id == chat_id, Chat.last_message_at < at).values(last_message_at=at)
    )
