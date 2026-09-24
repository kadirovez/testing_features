from collections.abc import Sequence
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import delete, func, or_, select, tuple_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.models import Contact, User


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


async def create_user(db: AsyncSession, **values: Any) -> User:
    """Insert a new user row (optional `id` for seeded system accounts)."""
    user = User(**values)
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def get_by_id(db: AsyncSession, user_id: UUID) -> User | None:
    """Fetch a non-deleted user by id."""
    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    return result.scalar_one_or_none()


async def get_by_email(db: AsyncSession, email: str) -> User | None:
    """Fetch a non-deleted user by case-insensitive email."""
    result = await db.execute(
        select(User).where(func.lower(User.email) == email.lower(), User.deleted_at.is_(None))
    )
    return result.scalar_one_or_none()


async def get_by_username(db: AsyncSession, username: str) -> User | None:
    """Fetch a user by case-insensitive username."""
    result = await db.execute(select(User).where(func.lower(User.username) == username.lower()))
    return result.scalar_one_or_none()


async def email_exists(db: AsyncSession, email: str) -> bool:
    """Check whether any user (including deleted) owns the email."""
    result = await db.execute(select(User.id).where(func.lower(User.email) == email.lower()))
    return result.first() is not None


async def list_by_ids(db: AsyncSession, user_ids: Sequence[UUID]) -> list[User]:
    """Fetch users by a list of ids."""
    if not user_ids:
        return []
    result = await db.execute(select(User).where(User.id.in_(user_ids)))
    return list(result.scalars())


async def update_user(db: AsyncSession, user_id: UUID, values: dict[str, Any]) -> User:
    """Update user columns and return the refreshed row."""
    await db.execute(update(User).where(User.id == user_id).values(**values))
    await db.flush()
    result = await db.execute(select(User).where(User.id == user_id).execution_options(populate_existing=True))
    return result.scalar_one()


async def search_users(
    db: AsyncSession,
    query: str,
    exclude_user_id: UUID,
    after: tuple[str, UUID] | None,
    limit: int,
) -> list[User]:
    """Search users by username/display name prefix, keyset-paginated by (lower(username), id)."""
    pattern = f"{_escape_like(query.lower())}%"
    sort_key = func.lower(User.username)
    stmt = select(User).where(
        User.deleted_at.is_(None),
        User.is_active.is_(True),
        User.is_system.is_(False),
        User.id != exclude_user_id,
        or_(sort_key.like(pattern, escape="\\"), func.lower(User.display_name).like(pattern, escape="\\")),
    )
    if after is not None:
        stmt = stmt.where(tuple_(sort_key, User.id) > tuple_(after[0], after[1]))
    stmt = stmt.order_by(sort_key, User.id).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars())


async def get_contact(db: AsyncSession, owner_id: UUID, contact_user_id: UUID) -> Contact | None:
    """Fetch a contact entry of an owner."""
    result = await db.execute(
        select(Contact).where(Contact.owner_id == owner_id, Contact.contact_user_id == contact_user_id)
    )
    return result.scalar_one_or_none()


async def create_contact(db: AsyncSession, owner_id: UUID, contact_user_id: UUID, alias: str | None) -> Contact:
    """Insert a contact entry."""
    contact = Contact(owner_id=owner_id, contact_user_id=contact_user_id, alias=alias)
    db.add(contact)
    await db.flush()
    await db.refresh(contact)
    return contact


async def delete_contact(db: AsyncSession, owner_id: UUID, contact_user_id: UUID) -> None:
    """Delete a contact entry (contacts are not long-term data, so this is a hard delete)."""
    await db.execute(
        delete(Contact).where(Contact.owner_id == owner_id, Contact.contact_user_id == contact_user_id)
    )


async def list_contacts(
    db: AsyncSession, owner_id: UUID, after: tuple[datetime, UUID] | None, limit: int
) -> list[tuple[Contact, User]]:
    """List contacts with their users, newest first, keyset-paginated by (created_at, id)."""
    stmt = (
        select(Contact, User)
        .join(User, User.id == Contact.contact_user_id)
        .where(Contact.owner_id == owner_id, User.deleted_at.is_(None))
    )
    if after is not None:
        stmt = stmt.where(tuple_(Contact.created_at, Contact.id) < tuple_(after[0], after[1]))
    stmt = stmt.order_by(Contact.created_at.desc(), Contact.id.desc()).limit(limit)
    result = await db.execute(stmt)
    return [(row[0], row[1]) for row in result.all()]


async def list_owner_ids_having_contact(db: AsyncSession, contact_user_id: UUID) -> list[UUID]:
    """Return ids of users who have the given user in their contacts."""
    result = await db.execute(select(Contact.owner_id).where(Contact.contact_user_id == contact_user_id))
    return list(result.scalars())


async def list_contact_pairs(
    db: AsyncSession, owner_ids: Sequence[UUID], contact_user_id: UUID
) -> list[UUID]:
    """Return which of the owners have the given user in their contacts."""
    if not owner_ids:
        return []
    result = await db.execute(
        select(Contact.owner_id).where(Contact.owner_id.in_(owner_ids), Contact.contact_user_id == contact_user_id)
    )
    return list(result.scalars())


async def list_owners_contacts(db: AsyncSession, owner_id: UUID, contact_user_ids: Sequence[UUID]) -> list[UUID]:
    """Return which of the given users are in the owner's contacts."""
    if not contact_user_ids:
        return []
    result = await db.execute(
        select(Contact.contact_user_id).where(
            Contact.owner_id == owner_id, Contact.contact_user_id.in_(contact_user_ids)
        )
    )
    return list(result.scalars())
