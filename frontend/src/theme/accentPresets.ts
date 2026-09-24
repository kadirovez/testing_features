import type { TranslationKey } from "../i18n";

export const ACCENT_PRESET_IDS = ["blue", "teal", "green", "violet", "rose", "amber"] as const;
export type AccentPresetId = (typeof ACCENT_PRESET_IDS)[number];
export const DEFAULT_ACCENT_PRESET_ID: AccentPresetId = "blue";

export function isAccentPresetId(value: unknown): value is AccentPresetId {
  return typeof value === "string" && (ACCENT_PRESET_IDS as readonly string[]).includes(value);
}

export function parseAccentPreset(theme: unknown): AccentPresetId {
  if (typeof theme !== "object" || theme === null) return DEFAULT_ACCENT_PRESET_ID;
  const accentId = (theme as { accentId?: unknown }).accentId;
  return isAccentPresetId(accentId) ? accentId : DEFAULT_ACCENT_PRESET_ID;
}

export interface AccentPresetMeta {
  id: AccentPresetId;
  labelKey: TranslationKey;
  swatch: string;
}

export const ACCENT_PRESETS: AccentPresetMeta[] = [
  { id: "blue", labelKey: "settings.accent.blue", swatch: "#1e40af" },
  { id: "teal", labelKey: "settings.accent.teal", swatch: "#0d9488" },
  { id: "green", labelKey: "settings.accent.green", swatch: "#15803d" },
  { id: "violet", labelKey: "settings.accent.violet", swatch: "#6d28d9" },
  { id: "rose", labelKey: "settings.accent.rose", swatch: "#be123c" },
  { id: "amber", labelKey: "settings.accent.amber", swatch: "#b45309" },
];

export function applyAccentPresetToDocument(presetId: AccentPresetId): void {
  document.documentElement.dataset.accent = presetId;
}
