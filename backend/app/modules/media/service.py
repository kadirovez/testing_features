import asyncio
import json
import logging
import os
import subprocess
import tempfile
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from botocore.exceptions import BotoCoreError, ClientError
from PIL import UnidentifiedImageError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import storage
from app.core.config import settings
from app.core.database import SessionFactory
from app.core.exceptions import AppError
from app.modules.media import repository as media_repo
from app.modules.media import tasks as media_tasks
from app.modules.media.models import MediaFile, MediaKind, MediaPurpose, MediaStatus
from app.modules.media.processing import ProcessedMedia, process_photo, process_video
from app.modules.media.schemas import DownloadUrlRead, MediaBrief, MediaRead, MediaVariant, UploadCreate, UploadRead
from app.modules.messages import service as messages_service
from app.modules.realtime import service as realtime_service
from app.modules.realtime.schemas import MediaReadyPayload, OutgoingEvent, WSEventType
from app.seed.errors.media import (
    MEDIA_ACCESS_DENIED,
    MEDIA_ALREADY_CONFIRMED,
    MEDIA_NOT_FOUND,
    MEDIA_NOT_READY,
    MEDIA_TOO_LARGE,
    UNSUPPORTED_MEDIA_TYPE,
    UPLOAD_NOT_FOUND_IN_STORAGE,
)

logger = logging.getLogger(__name__)

_USABLE_STATUSES = (MediaStatus.UPLOADED, MediaStatus.PROCESSING, MediaStatus.READY)
_MESSAGE_ATTACHABLE_STATUSES = (MediaStatus.PENDING, *_USABLE_STATUSES)
_PUBLIC_PURPOSES = (MediaPurpose.AVATAR, MediaPurpose.CHAT_AVATAR)
_STALE_CLEANUP_BATCH = 500


def _allowed_types(kind: MediaKind) -> list[str]:
    return settings.MEDIA_ALLOWED_PHOTO_TYPES if kind == MediaKind.PHOTO else settings.MEDIA_ALLOWED_VIDEO_TYPES


def _max_size(kind: MediaKind) -> int:
    return settings.MEDIA_MAX_PHOTO_BYTES if kind == MediaKind.PHOTO else settings.MEDIA_MAX_VIDEO_BYTES


async def _can_access(db: AsyncSession, user_id: UUID, media: MediaFile) -> bool:
    if media.owner_id == user_id or media.purpose in _PUBLIC_PURPOSES:
        return True
    return await messages_service.can_user_access_media(db, user_id, media.id)


async def _get_accessible_media(db: AsyncSession, user_id: UUID, media_id: UUID) -> MediaFile:
    media = await media_repo.get_by_id(db, media_id)
    # media does not exist
    if media is None:
        raise AppError(MEDIA_NOT_FOUND)

    # user has no relation to the media
    if not await _can_access(db, user_id, media):
        raise AppError(MEDIA_ACCESS_DENIED)

    return media


async def create_upload(db: AsyncSession, owner_id: UUID, data: UploadCreate) -> UploadRead:
    """Register a pending upload and return a presigned POST for direct upload to S3."""
    # mime type is not allowed for the declared kind
    if data.mime_type not in _allowed_types(data.kind):
        raise AppError(UNSUPPORTED_MEDIA_TYPE)

    # avatars must be photos
    if data.purpose in _PUBLIC_PURPOSES and data.kind != MediaKind.PHOTO:
        raise AppError(UNSUPPORTED_MEDIA_TYPE)

    # declared size exceeds the limit for the kind
    if data.size_bytes > _max_size(data.kind):
        raise AppError(MEDIA_TOO_LARGE)

    media_id = uuid4()
    media = await media_repo.create_media(
        db,
        id=media_id,
        owner_id=owner_id,
        kind=data.kind,
        purpose=data.purpose,
        status=MediaStatus.PENDING,
        storage_key=f"{data.purpose.value}/{owner_id}/{media_id}",
        mime_type=data.mime_type,
        size_bytes=data.size_bytes,
    )
    await db.commit()
    presigned = await storage.generate_presigned_upload(media.storage_key, media.mime_type, data.size_bytes)
    return UploadRead(
        media=MediaRead.model_validate(media),
        upload_url=presigned["url"],
        upload_fields={key: str(value) for key, value in presigned["fields"].items()},
        expires_in=settings.S3_PRESIGNED_UPLOAD_TTL_SECONDS,
    )


async def confirm_upload(db: AsyncSession, owner_id: UUID, media_id: UUID) -> MediaRead:
    """Verify the object landed in S3 and schedule thumbnail generation."""
    media = await media_repo.get_by_id(db, media_id)
    # media does not exist or belongs to another user
    if media is None or media.owner_id != owner_id:
        raise AppError(MEDIA_NOT_FOUND)

    # upload was already confirmed
    if media.status != MediaStatus.PENDING:
        raise AppError(MEDIA_ALREADY_CONFIRMED)

    head = await storage.head_object(media.storage_key)
    # client never uploaded the object
    if head is None:
        raise AppError(UPLOAD_NOT_FOUND_IN_STORAGE)

    actual_size = int(head.get("ContentLength", 0))
    # stored object exceeds the limit (defense in depth over the presigned policy)
    if actual_size > _max_size(media.kind):
        raise AppError(MEDIA_TOO_LARGE)

    # stored content type differs from the declared one
    if head.get("ContentType", "").lower() != media.mime_type:
        raise AppError(UNSUPPORTED_MEDIA_TYPE)

    media = await media_repo.update_media(db, media_id, {"status": MediaStatus.UPLOADED, "size_bytes": actual_size})
    await db.commit()
    media_tasks.generate_thumbnail_task.delay(str(media_id))
    return MediaRead.model_validate(media)


async def get_media(db: AsyncSession, user_id: UUID, media_id: UUID) -> MediaRead:
    """Return media metadata the user is allowed to see."""
    return MediaRead.model_validate(await _get_accessible_media(db, user_id, media_id))


async def get_download_url(db: AsyncSession, user_id: UUID, media_id: UUID, variant: MediaVariant) -> DownloadUrlRead:
    """Return a presigned GET URL for the original file or its thumbnail."""
    media = await _get_accessible_media(db, user_id, media_id)
    # file was never uploaded or processing failed
    if media.status not in _USABLE_STATUSES:
        raise AppError(MEDIA_NOT_READY)

    # thumbnail is not generated yet
    if variant == MediaVariant.THUMBNAIL and media.thumbnail_key is None:
        raise AppError(MEDIA_NOT_READY)

    key = media.thumbnail_key if variant == MediaVariant.THUMBNAIL else media.storage_key
    url = await storage.generate_presigned_download(key)
    return DownloadUrlRead(url=url, expires_in=settings.S3_PRESIGNED_DOWNLOAD_TTL_SECONDS)


async def get_attachable_media(db: AsyncSession, media_ids: Sequence[UUID], owner_id: UUID) -> list[MediaBrief]:
    """Return the owner's uploaded message media among the given ids."""
    media = await media_repo.list_owned_with_purpose(
        db, media_ids, owner_id, MediaPurpose.MESSAGE, _MESSAGE_ATTACHABLE_STATUSES
    )
    return [MediaBrief.model_validate(item) for item in media]


async def get_media_briefs(db: AsyncSession, media_ids: Sequence[UUID]) -> dict[UUID, MediaBrief]:
    """Return media projections by id."""
    return {item.id: MediaBrief.model_validate(item) for item in await media_repo.list_by_ids(db, list(set(media_ids)))}


async def is_valid_avatar(db: AsyncSession, media_id: UUID, owner_id: UUID) -> bool:
    """Check that media is an uploaded avatar photo owned by the user."""
    media = await media_repo.list_owned_with_purpose(db, [media_id], owner_id, MediaPurpose.AVATAR, _USABLE_STATUSES)
    return bool(media)


async def is_valid_chat_avatar(db: AsyncSession, media_id: UUID, owner_id: UUID) -> bool:
    """Check that media is an uploaded chat avatar photo owned by the user."""
    media = await media_repo.list_owned_with_purpose(
        db, [media_id], owner_id, MediaPurpose.CHAT_AVATAR, _USABLE_STATUSES
    )
    return bool(media)


async def _process_file(media: MediaFile) -> ProcessedMedia:
    fd, path = tempfile.mkstemp(prefix="media-")
    os.close(fd)
    try:
        await storage.download_file(media.storage_key, path)
        if media.kind == MediaKind.PHOTO:
            square = media.purpose == MediaPurpose.AVATAR
            return await asyncio.to_thread(process_photo, path, square)
        return await asyncio.to_thread(process_video, path)
    finally:
        os.unlink(path)


async def process_media(media_id: UUID) -> None:
    """Background job: extract metadata, render a thumbnail and notify the owner."""
    async with SessionFactory() as db:
        media = await media_repo.get_by_id(db, media_id)
        # media vanished or was already processed
        if media is None or media.status not in (MediaStatus.UPLOADED, MediaStatus.PROCESSING):
            return

        media = await media_repo.update_media(db, media_id, {"status": MediaStatus.PROCESSING})
        await db.commit()
        try:
            processed = await _process_file(media)
            thumbnail_key = f"{media.storage_key}.thumb.jpg"
            await storage.upload_bytes(thumbnail_key, processed.thumbnail_jpeg, "image/jpeg")
        except (
            OSError,
            UnidentifiedImageError,
            subprocess.SubprocessError,
            json.JSONDecodeError,
            ClientError,
            BotoCoreError,
        ):
            logger.exception("Media processing failed for %s", media_id)
            media = await media_repo.update_media(db, media_id, {"status": MediaStatus.FAILED})
        else:
            media = await media_repo.update_media(
                db,
                media_id,
                {
                    "status": MediaStatus.READY,
                    "thumbnail_key": thumbnail_key,
                    "width": processed.width,
                    "height": processed.height,
                    "duration_ms": processed.duration_ms,
                },
            )
        await db.commit()
        await realtime_service.publish_to_users(
            [media.owner_id],
            OutgoingEvent(
                type=WSEventType.MEDIA_READY,
                payload=MediaReadyPayload(media_id=media.id, status=media.status.value),
            ),
        )


async def cleanup_stale_uploads() -> int:
    """Background job: soft-delete uploads that were never confirmed and drop their objects."""
    created_before = datetime.now(UTC) - timedelta(hours=settings.MEDIA_STALE_UPLOAD_HOURS)
    async with SessionFactory() as db:
        stale = await media_repo.list_stale_pending(db, created_before, _STALE_CLEANUP_BATCH)
        for media in stale:
            try:
                await storage.delete_object(media.storage_key)
            except (ClientError, BotoCoreError):
                logger.warning("Could not delete stale object %s", media.storage_key)
            await media_repo.update_media(db, media.id, {"deleted_at": datetime.now(UTC)})
        await db.commit()
        return len(stale)
