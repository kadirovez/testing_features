import json
from collections.abc import Sequence
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings as app_config
from app.core.exceptions import AppError
from app.core.i18n.types import Locale
from app.modules.settings import repository as settings_repo
from app.modules.settings.models import OnlineStatusVisibility, UserSettings
from app.modules.settings.schemas import PrivacyFlags, SettingsRead, SettingsUpdate, ThemeUpdate
from app.modules.users import service as users_service
from app.seed.errors.settings import INVALID_THEME_CONFIG, THEME_CONFIG_TOO_LARGE, UNSUPPORTED_LANGUAGE

_SUPPORTED_LANGUAGES = {locale.value for locale in Locale}


def _json_depth(value: Any) -> int:
    if isinstance(value, dict):
        return 1 + max((_json_depth(item) for item in value.values()), default=0)
    if isinstance(value, list):
        return 1 + max((_json_depth(item) for item in value), default=0)
    return 0


async def _get_or_create(db: AsyncSession, user_id: UUID) -> UserSettings:
    existing = await settings_repo.get_by_user_id(db, user_id)
    if existing is not None:
        return existing
    created = await settings_repo.create_default(db, user_id)
    await db.commit()
    return created


async def get_settings(db: AsyncSession, user_id: UUID) -> SettingsRead:
    """Return the user's settings, creating defaults on first access."""
    return SettingsRead.model_validate(await _get_or_create(db, user_id))


async def update_app_settings(db: AsyncSession, user_id: UUID, data: SettingsUpdate) -> SettingsRead:
    """Update notification, privacy and language settings."""
    values = data.model_dump(exclude_unset=True, exclude_none=True)
    language = values.get("language")
    # only supported UI languages can be stored
    if language is not None and language.lower() not in _SUPPORTED_LANGUAGES:
        raise AppError(UNSUPPORTED_LANGUAGE)

    if language is not None:
        values["language"] = language.lower()
    current = await _get_or_create(db, user_id)
    if not values:
        return SettingsRead.model_validate(current)
    updated = await settings_repo.update_settings(db, user_id, values)
    await db.commit()
    return SettingsRead.model_validate(updated)


async def update_theme(db: AsyncSession, user_id: UUID, data: ThemeUpdate) -> SettingsRead:
    """Replace the user's theme customization JSON."""
    # theme payload exceeds the allowed size
    if len(json.dumps(data.theme).encode()) > app_config.THEME_MAX_BYTES:
        raise AppError(THEME_CONFIG_TOO_LARGE)

    # theme payload is nested too deeply
    if _json_depth(data.theme) > app_config.THEME_MAX_DEPTH:
        raise AppError(INVALID_THEME_CONFIG)

    await _get_or_create(db, user_id)
    updated = await settings_repo.update_settings(db, user_id, {"theme": data.theme})
    await db.commit()
    return SettingsRead.model_validate(updated)


async def get_privacy_flags(db: AsyncSession, user_ids: Sequence[UUID]) -> dict[UUID, PrivacyFlags]:
    """Return privacy flags for several users, using defaults for users without a settings row."""
    rows = {row.user_id: row for row in await settings_repo.list_by_user_ids(db, list(set(user_ids)))}
    return {
        user_id: PrivacyFlags.model_validate(rows[user_id]) if user_id in rows else PrivacyFlags(user_id=user_id)
        for user_id in user_ids
    }


async def get_read_receipt_hidden_user_ids(db: AsyncSession, user_ids: Sequence[UUID]) -> set[UUID]:
    """Return users who have disabled read receipts."""
    flags = await get_privacy_flags(db, user_ids)
    return {user_id for user_id, flag in flags.items() if not flag.read_receipts_visible}


async def get_presence_visible_user_ids(
    db: AsyncSession, viewer_id: UUID, target_ids: Sequence[UUID]
) -> set[UUID]:
    """Return the targets whose online status / last seen the viewer is allowed to see."""
    flags = await get_privacy_flags(db, target_ids)
    visible = {uid for uid, flag in flags.items() if flag.online_status_visibility == OnlineStatusVisibility.EVERYONE}
    contacts_only = [uid for uid, flag in flags.items() if flag.online_status_visibility == OnlineStatusVisibility.CONTACTS]
    if contacts_only:
        visible |= await users_service.filter_owners_having_contact(db, contacts_only, viewer_id)
    if viewer_id in flags:
        visible.add(viewer_id)
    return visible


async def filter_presence_audience(db: AsyncSession, user_id: UUID, audience_ids: Sequence[UUID]) -> set[UUID]:
    """Return the part of the audience allowed to see the user's online status."""
    visibility = (await get_privacy_flags(db, [user_id]))[user_id].online_status_visibility
    if visibility == OnlineStatusVisibility.EVERYONE:
        return set(audience_ids)
    if visibility == OnlineStatusVisibility.CONTACTS:
        return await users_service.filter_contacts_of(db, user_id, audience_ids)
    return set()
