import type { CSSProperties } from "react";
import { useChatAppearance } from "../../../context/ChatAppearanceContext";
import { useLocale } from "../../../context/LocaleContext";
import { ACCENT_PRESETS, accentPresetSwatchColor } from "../../../theme/accentPresets";
import { useTheme } from "../../../context/ThemeContext";
import { cn } from "@/lib/utils";

export function AccentPicker() {
  const { t } = useLocale();
  const { theme } = useTheme();
  const { accentPreset, setAccentPreset } = useChatAppearance();

  return (
    <div>
      <p className="mb-2 text-sm font-medium">{t("settings.accent.title")}</p>
      <div className="grid w-full grid-cols-3 gap-2.5">
        {ACCENT_PRESETS.map((preset) => {
          const active = accentPreset === preset.id;
          const swatch = accentPresetSwatchColor(preset, theme);
          return (
            <button
              key={preset.id}
              type="button"
              className={cn(
                "size-8 shrink-0 rounded-full border border-border/50 ring-2 ring-offset-2 ring-offset-card transition-[box-shadow] duration-150 outline-none focus-visible:ring-ring/50",
                active ? "ring-[var(--swatch)]" : "ring-transparent",
              )}
              style={{ "--swatch": swatch, backgroundColor: swatch } as CSSProperties}
              aria-label={t(preset.labelKey)}
              aria-pressed={active}
              onClick={() => setAccentPreset(preset.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
