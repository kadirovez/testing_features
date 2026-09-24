from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from app.seed.theme.accents import ACCENT_PRESET_IDS
from app.seed.theme.wallpapers import DEFAULT_WALLPAPER_PRESET_ID, WALLPAPER_PRESET_IDS

_THEME_KNOWN_KEYS = frozenset({"mode", "chatWallpaper", "accentId"})


class ChatWallpaperConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["preset", "custom"]
    preset_id: str | None = Field(default=None, alias="presetId")
    media_id: UUID | None = Field(default=None, alias="mediaId")

    @field_validator("preset_id")
    @classmethod
    def preset_must_be_known(cls, value: str | None) -> str | None:
        if value is not None and value not in WALLPAPER_PRESET_IDS:
            raise ValueError("unknown wallpaper preset")
        return value


def default_chat_wallpaper_payload() -> dict[str, Any]:
    return ChatWallpaperConfig(kind="preset", preset_id=DEFAULT_WALLPAPER_PRESET_ID).model_dump(
        by_alias=True, exclude_none=True
    )


def merge_theme_document(current: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    """Shallow-merge a theme patch into the stored document."""
    merged = {**current, **patch}
    if patch.get("chatWallpaper") is None and "chatWallpaper" in patch:
        merged.pop("chatWallpaper", None)
    return merged


def normalize_theme_document(theme: dict[str, Any]) -> dict[str, Any]:
    """Validate known theme keys and keep unknown top-level keys for forward compatibility."""
    passthrough = {key: value for key, value in theme.items() if key not in _THEME_KNOWN_KEYS}
    normalized: dict[str, Any] = dict(passthrough)

    mode = theme.get("mode")
    if mode is not None and mode not in ("light", "dark"):
        raise ValidationError.from_exception_data("ThemeDocument", [])
    if mode is not None:
        normalized["mode"] = mode

    raw_accent = theme.get("accentId")
    if raw_accent is not None:
        if raw_accent not in ACCENT_PRESET_IDS:
            raise ValidationError.from_exception_data("ThemeDocument", [])
        normalized["accentId"] = raw_accent

    raw_wallpaper = theme.get("chatWallpaper")
    if raw_wallpaper is not None:
        wallpaper = ChatWallpaperConfig.model_validate(raw_wallpaper)
        if wallpaper.kind == "preset" and wallpaper.preset_id is None:
            wallpaper = wallpaper.model_copy(update={"preset_id": DEFAULT_WALLPAPER_PRESET_ID})
        if wallpaper.kind == "custom" and wallpaper.media_id is None:
            raise ValidationError.from_exception_data("ChatWallpaperConfig", [])
        if wallpaper.kind == "preset" and wallpaper.media_id is not None:
            raise ValidationError.from_exception_data("ChatWallpaperConfig", [])
        normalized["chatWallpaper"] = wallpaper.model_dump(by_alias=True, exclude_none=True, mode="json")

    return normalized
