import type { TranslationKey } from "../i18n";
import type { ThemeMode } from "../context/ThemeContext";

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

/** Neutral accent swatches (shadcn neutral primary); id remains `blue` for API compatibility. */
export const NEUTRAL_ACCENT_SWATCH: Record<ThemeMode, string> = {
  light: "oklch(0.205 0 0)",
  dark: "oklch(0.922 0 0)",
};

export interface AccentPresetMeta {
  id: AccentPresetId;
  labelKey: TranslationKey;
  swatch: string;
}

export function accentPresetSwatchColor(preset: AccentPresetMeta, theme: ThemeMode): string {
  if (preset.id === "blue") return NEUTRAL_ACCENT_SWATCH[theme];
  return preset.swatch;
}

export const ACCENT_PRESETS: AccentPresetMeta[] = [
  { id: "blue", labelKey: "settings.accent.blue", swatch: NEUTRAL_ACCENT_SWATCH.light },
  { id: "teal", labelKey: "settings.accent.teal", swatch: "#0d9488" },
  { id: "green", labelKey: "settings.accent.green", swatch: "#15803d" },
  { id: "violet", labelKey: "settings.accent.violet", swatch: "#6d28d9" },
  { id: "rose", labelKey: "settings.accent.rose", swatch: "#be123c" },
  { id: "amber", labelKey: "settings.accent.amber", swatch: "#b45309" },
];

export function applyAccentPresetToDocument(presetId: AccentPresetId): void {
  document.documentElement.dataset.accent = presetId;
}
