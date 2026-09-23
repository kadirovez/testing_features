from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, StringConstraints

from app.modules.users.schemas import DisplayName, Username

Password = Annotated[str, StringConstraints(min_length=8, max_length=128)]
DeviceName = Annotated[str, StringConstraints(strip_whitespace=True, max_length=255)]


class RegisterRequest(BaseModel):
    email: EmailStr
    username: Username
    password: Password
    display_name: DisplayName
    device_name: DeviceName | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: Annotated[str, StringConstraints(min_length=1, max_length=128)]
    device_name: DeviceName | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    session_id: UUID


class SessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    device_name: str
    ip_address: str
    created_at: datetime
    last_active_at: datetime
    expires_at: datetime
    is_current: bool = False


class DeviceInfo(BaseModel):
    """Client device data captured at login/refresh time."""

    device_name: str
    ip_address: str


class CurrentSession(BaseModel):
    """Authenticated principal resolved from an access token."""

    user_id: UUID
    session_id: UUID


class CachedSession(BaseModel):
    """Session state mirrored in Redis for fast per-request checks."""

    user_id: UUID
    refresh_token_hash: str
    revoked: bool
    expires_at: datetime
