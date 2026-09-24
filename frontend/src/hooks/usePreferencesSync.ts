import { useEffect, useRef, useState } from "react";
import { ApiError } from "../api/client";
import { settingsApi } from "../api/settings";
import { parseChatWallpaper } from "../chatWallpaper/presets";
import { useChatAppearance } from "../context/ChatAppearanceContext";
import { useLocale } from "../context/LocaleContext";
import { isThemeMode, useTheme } from "../context/ThemeContext";
import { isLocale } from "../i18n";
import { parseAccentPreset } from "../theme/accentPresets";
import {
  appearanceThemeFingerprint,
  buildAppearanceThemePatch,
  getSyncedAppearanceFingerprint,
  markAppearanceSynced,
  readStoredAccent,
  readStoredWallpaper,
} from "../theme/appearanceStorage";

function ignoreApiError(error: unknown): void {
  if (!(error instanceof ApiError)) throw error;
  console.warn("preferences sync failed:", error.message);
}

function resolvedAppearanceFromServer(theme: Record<string, unknown>, fallbackMode: "light" | "dark") {
  const mode = isThemeMode(theme.mode) ? theme.mode : fallbackMode;
  const chatWallpaper =
    theme.chatWallpaper != null ? parseChatWallpaper(theme.chatWallpaper) : readStoredWallpaper();
  const accentPreset = theme.accentId != null ? parseAccentPreset(theme) : readStoredAccent();
  return { mode, chatWallpaper, accentPreset };
}

function serverAppearancePatch(theme: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (isThemeMode(theme.mode)) patch.mode = theme.mode;
  if (theme.chatWallpaper != null) patch.chatWallpaper = theme.chatWallpaper;
  if (theme.accentId != null) patch.accentId = theme.accentId;
  return patch;
}

/** Pulls theme/language from backend settings once, then pushes local changes back. */
export function usePreferencesSync(): void {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const { chatWallpaper, accentPreset, hydrated, setHydrated, loadFromServerTheme, setServerTheme } =
    useChatAppearance();
  const [settingsReady, setSettingsReady] = useState(false);
  const initialModeRef = useRef(theme);

  useEffect(() => {
    settingsApi
      .get()
      .then(async (settings) => {
        const themeDoc = settings.theme ?? {};
        loadFromServerTheme(themeDoc);
        const resolved = resolvedAppearanceFromServer(themeDoc, initialModeRef.current);
        if (isThemeMode(themeDoc.mode)) setTheme(themeDoc.mode);
        if (isLocale(settings.language)) setLocale(settings.language);

        const desiredPatch = buildAppearanceThemePatch(
          resolved.mode,
          resolved.chatWallpaper,
          resolved.accentPreset,
        );
        const needsBootstrap =
          appearanceThemeFingerprint(desiredPatch) !== appearanceThemeFingerprint(serverAppearancePatch(themeDoc));

        if (needsBootstrap) {
          const updated = await settingsApi.setTheme(desiredPatch);
          setServerTheme(updated.theme);
        }
        markAppearanceSynced(desiredPatch);
        setSettingsReady(true);
      })
      .catch(ignoreApiError)
      .finally(() => {
        setHydrated(true);
      });
  }, [setTheme, setLocale, loadFromServerTheme, setHydrated, setServerTheme]);

  useEffect(() => {
    if (!hydrated || !settingsReady) return;
    const patch = buildAppearanceThemePatch(theme, chatWallpaper, accentPreset);
    const fingerprint = appearanceThemeFingerprint(patch);
    if (fingerprint === getSyncedAppearanceFingerprint()) return;

    settingsApi
      .setTheme(patch)
      .then((settings) => {
        markAppearanceSynced(patch);
        setServerTheme(settings.theme);
      })
      .catch(ignoreApiError);
  }, [theme, chatWallpaper, accentPreset, hydrated, settingsReady, setServerTheme]);

  useEffect(() => {
    if (!hydrated) return;
    settingsApi.update({ language: locale }).catch(ignoreApiError);
  }, [locale, hydrated]);
}
