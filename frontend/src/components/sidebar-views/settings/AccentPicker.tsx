import type { CSSProperties } from "react";
import { useChatAppearance } from "../../../context/ChatAppearanceContext";
import { useLocale } from "../../../context/LocaleContext";
import { ACCENT_PRESETS } from "../../../theme/accentPresets";
import { cx } from "../../../utils/cx";
import styles from "./AccentPicker.module.css";

export function AccentPicker() {
  const { t } = useLocale();
  const { accentPreset, setAccentPreset } = useChatAppearance();

  return (
    <div className={styles.block}>
      <p className={styles.label}>{t("settings.accent.title")}</p>
      <div className={styles.row} role="list">
        {ACCENT_PRESETS.map((preset) => {
          const active = accentPreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              role="listitem"
              className={cx(styles.swatch, active && styles.active)}
              style={{ "--swatch": preset.swatch } as CSSProperties}
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
