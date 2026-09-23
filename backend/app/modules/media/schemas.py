from datetime import datetime
from enum import StrEnum
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, computed_field

from app.modules.media.models import MediaKind, MediaPurpose, MediaStatus


class MediaVariant(StrEnum):
    ORIGINAL = "original"
    THUMBNAIL = "thumbnail"


class UploadCreate(BaseModel):
    kind: MediaKind
    purpose: MediaPurpose
    mime_type: Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, max_length=128)]
    size_bytes: int = Field(gt=0)


class MediaBrief(BaseModel):
    """Media projection embedded into messages and shared with other modules."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    kind: MediaKind
    status: MediaStatus
    mime_type: str
    size_bytes: int
    width: int | None
    height: int | None
    duration_ms: int | None
    thumbnail_key: str | None = Field(default=None, exclude=True)

    @computed_field
    @property
    def has_thumbnail(self) -> bool:
        return self.thumbnail_key is not None


class MediaRead(MediaBrief):
    owner_id: UUID
    purpose: MediaPurpose
    created_at: datetime


class UploadRead(BaseModel):
    media: MediaRead
    upload_url: str
    upload_fields: dict[str, str]
    expires_in: int


class DownloadUrlRead(BaseModel):
    url: str
    expires_in: int
