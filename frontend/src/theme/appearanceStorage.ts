import type { ChatWallpaperConfig } from "../chatWallpaper/presets";
import { defaultChatWallpaper, parseChatWallpaper } from "../chatWallpaper/presets";
import type { ThemeMode } from "../context/ThemeContext";
import { DEFAULT_ACCENT_PRESET_ID, isAccentPresetId, type AccentPresetId } from "./accentPresets";

const WALLPAPER_KEY = "messenger.chatWallpaper";
const ACCENT_KEY = "messenger.accent";

export function chatWallpaperToPayload(config: ChatWallpaperConfig): Record<string, unknown> {
  if (config.kind === "custom") return { kind: "custom", mediaId: config.mediaId };
  return { kind: "preset", presetId: config.presetId };
}

export function accentPresetToPayload(presetId: AccentPresetId): string {
  return presetId;
}

export function readStoredWallpaper(): ChatWallpaperConfig {
  try {
    const raw = localStorage.getItem(WALLPAPER_KEY);
    if (!raw) return defaultChatWallpaper();
    return parseChatWallpaper(JSON.parse(raw));
  } catch {
    return defaultChatWallpaper();
  }
}

export function writeStoredWallpaper(config: ChatWallpaperConfig): void {
  try {
    localStorage.setItem(WALLPAPER_KEY, JSON.stringify(chatWallpaperToPayload(config)));
  } catch {
    /* private mode / quota */
  }
}

export function readStoredAccent(): AccentPresetId {
  try {
    const raw = localStorage.getItem(ACCENT_KEY);
    return raw && isAccentPresetId(raw) ? raw : DEFAULT_ACCENT_PRESET_ID;
  } catch {
    return DEFAULT_ACCENT_PRESET_ID;
  }
}

export function writeStoredAccent(presetId: AccentPresetId): void {
  try {
    localStorage.setItem(ACCENT_KEY, presetId);
  } catch {
    /* private mode / quota */
  }
}

export function buildAppearanceThemePatch(
  mode: ThemeMode,
  chatWallpaper: ChatWallpaperConfig,
  accentPreset: AccentPresetId,
): Record<string, unknown> {
  return {
    mode,
    chatWallpaper: chatWallpaperToPayload(chatWallpaper),
    accentId: accentPresetToPayload(accentPreset),
  };
}

export function appearanceThemeFingerprint(patch: Record<string, unknown>): string {
  return JSON.stringify(patch);
}

let lastSyncedAppearanceFingerprint: string | null = null;

export function getSyncedAppearanceFingerprint(): string | null {
  return lastSyncedAppearanceFingerprint;
}

export function markAppearanceSynced(patch: Record<string, unknown>): void {
  lastSyncedAppearanceFingerprint = appearanceThemeFingerprint(patch);
}
