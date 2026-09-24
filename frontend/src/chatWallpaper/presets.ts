import type { TranslationKey } from "../i18n";

export type WallpaperPresetId = "classic" | "dots" | "grid" | "diagonal" | "circles" | "honeycomb" | "waves";

export interface ChatWallpaperConfig {
  kind: "preset" | "custom";
  presetId?: WallpaperPresetId;
  mediaId?: string;
}

export interface WallpaperPreset {
  id: WallpaperPresetId;
  labelKey: TranslationKey;
  src: string;
  tileSize: string;
  tiled: boolean;
}

export const DEFAULT_WALLPAPER_PRESET_ID: WallpaperPresetId = "classic";

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  { id: "classic", labelKey: "settings.wallpaper.classic", src: "/chat-bg-pattern.svg", tileSize: "240px", tiled: true },
  { id: "dots", labelKey: "settings.wallpaper.dots", src: "/wallpapers/dots.svg", tileSize: "48px", tiled: true },
  { id: "grid", labelKey: "settings.wallpaper.grid", src: "/wallpapers/grid.svg", tileSize: "64px", tiled: true },
  { id: "diagonal", labelKey: "settings.wallpaper.diagonal", src: "/wallpapers/diagonal.svg", tileSize: "56px", tiled: true },
  { id: "circles", labelKey: "settings.wallpaper.circles", src: "/wallpapers/circles.svg", tileSize: "96px", tiled: true },
  { id: "honeycomb", labelKey: "settings.wallpaper.honeycomb", src: "/wallpapers/honeycomb.svg", tileSize: "84px", tiled: true },
  { id: "waves", labelKey: "settings.wallpaper.waves", src: "/wallpapers/waves.svg", tileSize: "120px", tiled: true },
];

const presetById = new Map(WALLPAPER_PRESETS.map((preset) => [preset.id, preset]));

export function getWallpaperPreset(id: WallpaperPresetId | undefined): WallpaperPreset {
  return presetById.get(id ?? DEFAULT_WALLPAPER_PRESET_ID) ?? WALLPAPER_PRESETS[0];
}

export function defaultChatWallpaper(): ChatWallpaperConfig {
  return { kind: "preset", presetId: DEFAULT_WALLPAPER_PRESET_ID };
}

export function parseChatWallpaper(raw: unknown): ChatWallpaperConfig {
  if (!raw || typeof raw !== "object") return defaultChatWallpaper();
  const value = raw as Record<string, unknown>;
  if (value.kind === "custom" && typeof value.mediaId === "string") {
    return { kind: "custom", mediaId: value.mediaId };
  }
  if (value.kind === "preset" && typeof value.presetId === "string" && presetById.has(value.presetId as WallpaperPresetId)) {
    return { kind: "preset", presetId: value.presetId as WallpaperPresetId };
  }
  return defaultChatWallpaper();
}
