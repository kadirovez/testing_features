"""Allowed chat wallpaper preset ids (client renders assets for these)."""

WALLPAPER_PRESET_IDS: frozenset[str] = frozenset(
    {"classic", "dots", "grid", "diagonal", "circles", "honeycomb", "waves"}
)

DEFAULT_WALLPAPER_PRESET_ID = "classic"
