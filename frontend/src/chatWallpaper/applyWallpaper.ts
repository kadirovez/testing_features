import type { CSSProperties } from "react";
import type { ThemeMode } from "../context/ThemeContext";
import type { ChatWallpaperConfig } from "./presets";
import { getWallpaperPreset, isNeutralWallpaperPreset } from "./presets";

const DARK_PRESET_FILTER = "invert(1)";
const DARK_PATTERN_OPACITY = 0.28;
const LIGHT_PATTERN_OPACITY = 1;

/** Inline styles for the tiled/cover pattern layer over `bg-chat`. */
export function getChatWallpaperPatternStyle(
  wallpaper: ChatWallpaperConfig,
  customUrl: string | null,
  theme: ThemeMode,
): CSSProperties | undefined {
  if (wallpaper.kind === "custom") {
    if (!customUrl) return undefined;
    return {
      backgroundImage: `url("${customUrl}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      opacity: 1,
    };
  }

  const preset = getWallpaperPreset(wallpaper.presetId);
  if (isNeutralWallpaperPreset(preset) || !preset.src) return undefined;

  return {
    backgroundImage: `url("${preset.src}")`,
    backgroundSize: preset.tiled ? preset.tileSize : "cover",
    backgroundPosition: preset.tiled ? "top left" : "center",
    backgroundRepeat: preset.tiled ? "repeat" : "no-repeat",
    opacity: theme === "dark" ? DARK_PATTERN_OPACITY : LIGHT_PATTERN_OPACITY,
    filter: theme === "dark" ? DARK_PRESET_FILTER : undefined,
  };
}
