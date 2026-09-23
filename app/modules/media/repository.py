from collections.abc import Sequence
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.media.models import MediaFile, MediaPurpose, MediaStatus


async def create_media(db: AsyncSession, **values: Any) -> MediaFile:
    """Insert a media file row."""
    media = MediaFile(**values)
    db.add(media)
    await db.flush()
    await db.refresh(media)
    return media


async def get_by_id(db: AsyncSession, media_id: UUID) -> MediaFile | None:
    """Fetch a non-deleted media file by id."""
    result = await db.execute(select(MediaFile).where(MediaFile.id == media_id, MediaFile.deleted_at.is_(None)))
    return result.scalar_one_or_none()


async def update_media(db: AsyncSession, media_id: UUID, values: dict[str, Any]) -> MediaFile:
    """Update media columns and return the refreshed row."""
    await db.execute(update(MediaFile).where(MediaFile.id == media_id).values(**values))
    result = await db.execute(
        select(MediaFile).where(MediaFile.id == media_id).execution_options(populate_existing=True)
    )
    return result.scalar_one()


async def list_by_ids(db: AsyncSession, media_ids: Sequence[UUID]) -> list[MediaFile]:
    """Fetch media files by ids."""
    if not media_ids:
        return []
    result = await db.execute(select(MediaFile).where(MediaFile.id.in_(media_ids)))
    return list(result.scalars())


async def list_owned_with_purpose(
    db: AsyncSession,
    media_ids: Sequence[UUID],
    owner_id: UUID,
    purpose: MediaPurpose,
    statuses: Sequence[MediaStatus],
) -> list[MediaFile]:
    """Fetch the owner's non-deleted media with a given purpose and status."""
    if not media_ids:
        return []
    result = await db.execute(
        select(MediaFile).where(
            MediaFile.id.in_(media_ids),
            MediaFile.owner_id == owner_id,
            MediaFile.purpose == purpose,
            MediaFile.status.in_(statuses),
            MediaFile.deleted_at.is_(None),
        )
    )
    return list(result.scalars())


async def list_stale_pending(db: AsyncSession, created_before: datetime, limit: int) -> list[MediaFile]:
    """List pending uploads that were never confirmed."""
    result = await db.execute(
        select(MediaFile)
        .where(
            MediaFile.status == MediaStatus.PENDING,
            MediaFile.created_at < created_before,
            MediaFile.deleted_at.is_(None),
        )
        .order_by(MediaFile.created_at)
        .limit(limit)
    )
    return list(result.scalars())
