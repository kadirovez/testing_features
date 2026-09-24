import { useCallback } from "react";
import { settingsApi } from "../api/settings";
import type { ChatWallpaperConfig } from "../chatWallpaper/presets";
import { useChatAppearance } from "../context/ChatAppearanceContext";
import { useTheme } from "../context/ThemeContext";
import type { AccentPresetId } from "../theme/accentPresets";
import { buildAppearanceThemePatch, markAppearanceSynced } from "../theme/appearanceStorage";

/** Push the current (or overridden) appearance slice to user settings on the server. */
export function useAppearanceThemeSave() {
  const { theme } = useTheme();
  const { chatWallpaper, accentPreset, setServerTheme } = useChatAppearance();

  return useCallback(
    async (overrides?: {
      chatWallpaper?: ChatWallpaperConfig;
      accentPreset?: AccentPresetId;
    }) => {
      const patch = buildAppearanceThemePatch(
        theme,
        overrides?.chatWallpaper ?? chatWallpaper,
        overrides?.accentPreset ?? accentPreset,
      );
      const settings = await settingsApi.setTheme(patch);
      markAppearanceSynced(patch);
      setServerTheme(settings.theme);
      return patch;
    },
    [theme, chatWallpaper, accentPreset, setServerTheme],
  );
}
