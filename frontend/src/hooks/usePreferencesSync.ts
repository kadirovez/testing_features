import { useEffect, useRef } from "react";
import { ApiError } from "../api/client";
import { settingsApi } from "../api/settings";
import { useLocale } from "../context/LocaleContext";
import { isThemeMode, useTheme } from "../context/ThemeContext";
import { isLocale } from "../i18n";

function ignoreApiError(error: unknown): void {
  if (!(error instanceof ApiError)) throw error;
  console.warn("preferences sync failed:", error.message);
}

/** Pulls theme/language from backend settings once, then pushes local changes back. */
export function usePreferencesSync(): void {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const hydrated = useRef(false);

  useEffect(() => {
    settingsApi
      .get()
      .then((settings) => {
        if (isThemeMode(settings.theme.mode)) setTheme(settings.theme.mode);
        if (isLocale(settings.language)) setLocale(settings.language);
      })
      .catch(ignoreApiError)
      .finally(() => {
        hydrated.current = true;
      });
  }, [setTheme, setLocale]);

  useEffect(() => {
    if (hydrated.current) settingsApi.setTheme({ mode: theme }).catch(ignoreApiError);
  }, [theme]);

  useEffect(() => {
    if (hydrated.current) settingsApi.update({ language: locale }).catch(ignoreApiError);
  }, [locale]);
}
