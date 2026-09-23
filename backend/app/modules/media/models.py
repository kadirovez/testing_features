from datetime import datetime
from enum import StrEnum
from uuid import UUID

from sqlalchemy import BigInteger, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, UUIDPkMixin, str_enum


class MediaKind(StrEnum):
    PHOTO = "photo"
    VIDEO = "video"


class MediaPurpose(StrEnum):
    AVATAR = "avatar"
    CHAT_AVATAR = "chat_avatar"
    MESSAGE = "message"


class MediaStatus(StrEnum):
    PENDING = "pending"
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class MediaFile(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "media_files"

    owner_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    kind: Mapped[MediaKind] = mapped_column(str_enum(MediaKind, "media_kind"))
    purpose: Mapped[MediaPurpose] = mapped_column(str_enum(MediaPurpose, "media_purpose"))
    status: Mapped[MediaStatus] = mapped_column(str_enum(MediaStatus, "media_status"), default=MediaStatus.PENDING)
    storage_key: Mapped[str] = mapped_column(String(512), unique=True)
    thumbnail_key: Mapped[str | None] = mapped_column(String(512))
    mime_type: Mapped[str] = mapped_column(String(128))
    size_bytes: Mapped[int] = mapped_column(BigInteger)
    width: Mapped[int | None]
    height: Mapped[int | None]
    duration_ms: Mapped[int | None]
    deleted_at: Mapped[datetime | None]


Index("ix_media_files_owner_id_created_at", MediaFile.owner_id, MediaFile.created_at.desc())
Index("ix_media_files_status_created_at", MediaFile.status, MediaFile.created_at)
