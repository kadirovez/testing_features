from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, StringConstraints

Username = Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9_]{3,32}$")]
DisplayName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]
Bio = Annotated[str, StringConstraints(max_length=500)]


class UserCreate(BaseModel):
    """Internal payload used by the auth module to create a user."""

    email: EmailStr
    username: Username
    password_hash: str
    display_name: DisplayName


class UserCredentials(BaseModel):
    """Internal projection used by the auth module to verify a login."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    password_hash: str
    is_active: bool
    is_system: bool


class UserBrief(BaseModel):
    """Minimal user projection shared with other modules."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str
    display_name: str
    avatar_media_id: UUID | None


class UserRead(BaseModel):
    """Full profile of the current user."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    username: str
    display_name: str
    bio: str | None
    avatar_media_id: UUID | None
    created_at: datetime


class UserPublicRead(BaseModel):
    """Profile of another user as seen by the viewer."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str
    display_name: str
    bio: str | None
    avatar_media_id: UUID | None
    last_seen_at: datetime | None = None


class UserUpdate(BaseModel):
    username: Username | None = None
    display_name: DisplayName | None = None
    bio: Bio | None = None


class AvatarUpdate(BaseModel):
    media_id: UUID


class ContactCreate(BaseModel):
    user_id: UUID
    alias: DisplayName | None = None


class ContactRead(BaseModel):
    user: UserPublicRead
    alias: str | None
    created_at: datetime
