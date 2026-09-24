import { en } from "./en";
import { ru, type Dictionary } from "./ru";

export type { TranslationKey } from "./ru";

export const LOCALES = {
  ru: { label: "Русский", dictionary: ru as Dictionary },
  en: { label: "English", dictionary: en },
} as const;

export type Locale = keyof typeof LOCALES;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && value in LOCALES;
}
