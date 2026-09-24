import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setClientLocale } from "../api/client";
import { isLocale, LOCALES, type Locale, type TranslationKey } from "../i18n";

const STORAGE_KEY = "messenger.locale";

type Params = Record<string, string | number>;

interface LocaleValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Params) => string;
}

const LocaleContext = createContext<LocaleValue | null>(null);

function initialLocale(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (isLocale(saved)) return saved;
  const browser = navigator.language.slice(0, 2);
  return isLocale(browser) ? browser : "ru";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
    setClientLocale(locale);
  }, [locale]);

  const t = useCallback(
    (key: TranslationKey, params?: Params) => {
      const template = LOCALES[locale].dictionary[key];
      if (!params) return template;
      return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ""));
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside LocaleProvider");
  return value;
}
