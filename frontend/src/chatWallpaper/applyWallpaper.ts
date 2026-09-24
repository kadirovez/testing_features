import type { ThemeMode } from "../context/ThemeContext";
import type { ChatWallpaperConfig } from "./presets";
import { getWallpaperPreset } from "./presets";

const DARK_PRESET_FILTER = "brightness(1.65) contrast(1.12)";
const DARK_PRESET_OPACITY = "0.38";

export function applyChatWallpaperToDocument(
  wallpaper: ChatWallpaperConfig,
  customUrl: string | null,
  theme: ThemeMode,
): void {
  const root = document.documentElement;
  if (wallpaper.kind === "custom") {
    if (!customUrl) return;
    root.style.setProperty("--chat-bg-image", `url("${customUrl}")`);
    root.style.setProperty("--chat-bg-size", "cover");
    root.style.setProperty("--chat-bg-position", "center");
    root.style.setProperty("--chat-pattern-opacity", "1");
    root.style.setProperty("--chat-bg-repeat", "no-repeat");
    root.style.setProperty("--chat-wallpaper-filter", "none");
    return;
  }

  const preset = getWallpaperPreset(wallpaper.presetId);
  root.style.setProperty("--chat-bg-image", `url("${preset.src}")`);
  root.style.setProperty("--chat-bg-size", preset.tiled ? preset.tileSize : "cover");
  root.style.setProperty("--chat-bg-position", preset.tiled ? "top left" : "center");
  root.style.setProperty("--chat-bg-repeat", preset.tiled ? "repeat" : "no-repeat");
  if (theme === "dark") {
    root.style.setProperty("--chat-pattern-opacity", DARK_PRESET_OPACITY);
    root.style.setProperty("--chat-wallpaper-filter", DARK_PRESET_FILTER);
  } else {
    root.style.removeProperty("--chat-pattern-opacity");
    root.style.setProperty("--chat-wallpaper-filter", "none");
  }
}
