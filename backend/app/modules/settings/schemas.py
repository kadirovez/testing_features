from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, StringConstraints

from app.modules.settings.models import OnlineStatusVisibility


class SettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    notifications_enabled: bool
    notification_preview: bool
    read_receipts_visible: bool
    online_status_visibility: OnlineStatusVisibility
    language: str
    theme: dict[str, Any]
    updated_at: datetime


class SettingsUpdate(BaseModel):
    notifications_enabled: bool | None = None
    notification_preview: bool | None = None
    read_receipts_visible: bool | None = None
    online_status_visibility: OnlineStatusVisibility | None = None
    language: Annotated[str, StringConstraints(strip_whitespace=True, max_length=8)] | None = None


class ThemeUpdate(BaseModel):
    theme: dict[str, Any]


class PrivacyFlags(BaseModel):
    """Privacy-relevant settings of a user, shared with other modules."""

    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    read_receipts_visible: bool = True
    online_status_visibility: OnlineStatusVisibility = OnlineStatusVisibility.EVERYONE
