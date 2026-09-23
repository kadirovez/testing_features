from collections.abc import Sequence
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.core.pagination import Page, decode_cursor, decode_datetime_cursor, encode_cursor
from app.modules.media import service as media_service
from app.modules.settings import service as settings_service
from app.modules.users import repository as user_repo
from app.modules.users.models import User
from app.modules.users.schemas import (
    ContactCreate,
    ContactRead,
    UserBrief,
    UserCreate,
    UserCredentials,
    UserPublicRead,
    UserRead,
    UserUpdate,
)
from app.seed.errors.users import (
    CANNOT_ADD_SELF_TO_CONTACTS,
    CONTACT_ALREADY_EXISTS,
    CONTACT_NOT_FOUND,
    EMAIL_ALREADY_TAKEN,
    INVALID_AVATAR_MEDIA,
    USER_NOT_FOUND,
    USERNAME_ALREADY_TAKEN,
)


async def _to_public(db: AsyncSession, viewer_id: UUID, users: Sequence[User]) -> list[UserPublicRead]:
    visible_ids = await settings_service.get_presence_visible_user_ids(db, viewer_id, [user.id for user in users])
    result: list[UserPublicRead] = []
    for user in users:
        public = UserPublicRead.model_validate(user)
        if user.id not in visible_ids:
            public.last_seen_at = None
        result.append(public)
    return result


async def create_user(db: AsyncSession, data: UserCreate) -> UserRead:
    """Create a user inside the caller's transaction (the caller commits)."""
    # email is already registered
    if await user_repo.email_exists(db, data.email):
        raise AppError(EMAIL_ALREADY_TAKEN)

    # username is already taken
    if await user_repo.get_by_username(db, data.username) is not None:
        raise AppError(USERNAME_ALREADY_TAKEN)

    user = await user_repo.create_user(
        db,
        email=data.email.lower(),
        username=data.username,
        password_hash=data.password_hash,
        display_name=data.display_name,
    )
    return UserRead.model_validate(user)


async def get_user_credentials_by_email(db: AsyncSession, email: str) -> UserCredentials | None:
    """Return login credentials for an email, or None if the user does not exist."""
    user = await user_repo.get_by_email(db, email)
    return UserCredentials.model_validate(user) if user is not None else None


async def is_user_active(db: AsyncSession, user_id: UUID) -> bool:
    """Check that a user exists and is active."""
    user = await user_repo.get_by_id(db, user_id)
    return user is not None and user.is_active


async def get_my_profile(db: AsyncSession, user_id: UUID) -> UserRead:
    """Return the full profile of the current user."""
    user = await user_repo.get_by_id(db, user_id)
    # user was deleted after the token was issued
    if user is None:
        raise AppError(USER_NOT_FOUND)

    return UserRead.model_validate(user)


async def update_profile(db: AsyncSession, user_id: UUID, data: UserUpdate) -> UserRead:
    """Update editable profile fields of the current user."""
    user = await user_repo.get_by_id(db, user_id)
    # user was deleted after the token was issued
    if user is None:
        raise AppError(USER_NOT_FOUND)

    values = data.model_dump(exclude_unset=True, exclude_none=True)
    new_username = values.get("username")
    if new_username is not None and new_username.lower() != user.username.lower():
        # username belongs to another user
        if await user_repo.get_by_username(db, new_username) is not None:
            raise AppError(USERNAME_ALREADY_TAKEN)

    if values:
        user = await user_repo.update_user(db, user_id, values)
        await db.commit()
    return UserRead.model_validate(user)


async def get_public_profile(db: AsyncSession, viewer_id: UUID, user_id: UUID) -> UserPublicRead:
    """Return another user's profile, hiding last seen according to their privacy settings."""
    user = await user_repo.get_by_id(db, user_id)
    # user does not exist
    if user is None:
        raise AppError(USER_NOT_FOUND)

    return (await _to_public(db, viewer_id, [user]))[0]


async def search_users(
    db: AsyncSession, viewer_id: UUID, query: str, cursor: str | None, limit: int
) -> Page[UserPublicRead]:
    """Search users by username or display name prefix."""
    after = decode_cursor(cursor) if cursor else None
    users = await user_repo.search_users(db, query, viewer_id, after, limit + 1)
    has_more = len(users) > limit
    users = users[:limit]
    next_cursor = encode_cursor(users[-1].username.lower(), users[-1].id) if has_more else None
    return Page(items=await _to_public(db, viewer_id, users), next_cursor=next_cursor)


async def get_user_brief(db: AsyncSession, user_id: UUID) -> UserBrief:
    """Return a minimal projection of an existing user."""
    user = await user_repo.get_by_id(db, user_id)
    # user does not exist
    if user is None:
        raise AppError(USER_NOT_FOUND)

    return UserBrief.model_validate(user)


async def get_users_brief(db: AsyncSession, user_ids: Sequence[UUID]) -> dict[UUID, UserBrief]:
    """Return minimal projections for a set of user ids (missing ids are skipped)."""
    users = await user_repo.list_by_ids(db, list(set(user_ids)))
    return {user.id: UserBrief.model_validate(user) for user in users}


async def touch_last_seen(db: AsyncSession, user_id: UUID) -> None:
    """Record the moment the user was last online."""
    await user_repo.update_user(db, user_id, {"last_seen_at": datetime.now(UTC)})
    await db.commit()


async def add_contact(db: AsyncSession, owner_id: UUID, data: ContactCreate) -> ContactRead:
    """Add another user to the owner's contacts."""
    # users cannot add themselves
    if data.user_id == owner_id:
        raise AppError(CANNOT_ADD_SELF_TO_CONTACTS)

    target = await user_repo.get_by_id(db, data.user_id)
    # target user does not exist
    if target is None:
        raise AppError(USER_NOT_FOUND)

    # target is already a contact
    if await user_repo.get_contact(db, owner_id, data.user_id) is not None:
        raise AppError(CONTACT_ALREADY_EXISTS)

    contact = await user_repo.create_contact(db, owner_id, data.user_id, data.alias)
    await db.commit()
    public = (await _to_public(db, owner_id, [target]))[0]
    return ContactRead(user=public, alias=contact.alias, created_at=contact.created_at)


async def remove_contact(db: AsyncSession, owner_id: UUID, contact_user_id: UUID) -> None:
    """Remove a user from the owner's contacts."""
    # user is not in contacts
    if await user_repo.get_contact(db, owner_id, contact_user_id) is None:
        raise AppError(CONTACT_NOT_FOUND)

    await user_repo.delete_contact(db, owner_id, contact_user_id)
    await db.commit()


async def list_contacts(db: AsyncSession, owner_id: UUID, cursor: str | None, limit: int) -> Page[ContactRead]:
    """List the owner's contacts, newest first."""
    after = decode_datetime_cursor(cursor) if cursor else None
    rows = await user_repo.list_contacts(db, owner_id, after, limit + 1)
    has_more = len(rows) > limit
    rows = rows[:limit]
    publics = await _to_public(db, owner_id, [user for _, user in rows])
    items = [
        ContactRead(user=public, alias=contact.alias, created_at=contact.created_at)
        for (contact, _), public in zip(rows, publics, strict=True)
    ]
    next_cursor = encode_cursor(rows[-1][0].created_at, rows[-1][0].id) if has_more else None
    return Page(items=items, next_cursor=next_cursor)


async def get_contact_owner_ids(db: AsyncSession, user_id: UUID) -> list[UUID]:
    """Return ids of users who have the given user in their contacts."""
    return await user_repo.list_owner_ids_having_contact(db, user_id)


async def filter_owners_having_contact(db: AsyncSession, owner_ids: Sequence[UUID], contact_user_id: UUID) -> set[UUID]:
    """Return the subset of owners that have `contact_user_id` in their contacts."""
    return set(await user_repo.list_contact_pairs(db, owner_ids, contact_user_id))


async def filter_contacts_of(db: AsyncSession, owner_id: UUID, user_ids: Sequence[UUID]) -> set[UUID]:
    """Return the subset of users that are in the owner's contacts."""
    return set(await user_repo.list_owners_contacts(db, owner_id, user_ids))


async def set_avatar(db: AsyncSession, user_id: UUID, media_id: UUID) -> UserRead:
    """Set an uploaded photo as the current user's avatar."""
    # media must be a ready avatar photo owned by the user
    if not await media_service.is_valid_avatar(db, media_id, user_id):
        raise AppError(INVALID_AVATAR_MEDIA)

    user = await user_repo.update_user(db, user_id, {"avatar_media_id": media_id})
    await db.commit()
    return UserRead.model_validate(user)


async def remove_avatar(db: AsyncSession, user_id: UUID) -> UserRead:
    """Remove the current user's avatar."""
    user = await user_repo.update_user(db, user_id, {"avatar_media_id": None})
    await db.commit()
    return UserRead.model_validate(user)
