from collections.abc import Sequence
from typing import Any
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.settings.models import UserSettings


async def get_by_user_id(db: AsyncSession, user_id: UUID) -> UserSettings | None:
    """Fetch settings of a user."""
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user_id))
    return result.scalar_one_or_none()


async def create_default(db: AsyncSession, user_id: UUID) -> UserSettings:
    """Insert default settings for a user (no-op if they already exist) and return them."""
    await db.execute(insert(UserSettings).values(user_id=user_id).on_conflict_do_nothing())
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == user_id).execution_options(populate_existing=True)
    )
    return result.scalar_one()


async def update_settings(db: AsyncSession, user_id: UUID, values: dict[str, Any]) -> UserSettings:
    """Update settings columns and return the refreshed row."""
    await db.execute(update(UserSettings).where(UserSettings.user_id == user_id).values(**values))
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == user_id).execution_options(populate_existing=True)
    )
    return result.scalar_one()


async def list_by_user_ids(db: AsyncSession, user_ids: Sequence[UUID]) -> list[UserSettings]:
    """Fetch settings rows for several users."""
    if not user_ids:
        return []
    result = await db.execute(select(UserSettings).where(UserSettings.user_id.in_(user_ids)))
    return list(result.scalars())
