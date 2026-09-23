import { Moon } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { useTheme } from "../../context/ThemeContext";
import { cx } from "../../utils/cx";
import styles from "./ThemeToggle.module.css";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLocale();
  const isDark = theme === "dark";

  return (
    <button type="button" role="switch" aria-checked={isDark} className={styles.row} onClick={toggleTheme}>
      <Moon size={20} strokeWidth={1.75} className={styles.icon} />
      <span className={styles.label}>{t("settings.darkTheme")}</span>
      <span className={cx(styles.track, isDark && styles.on)}>
        <span className={styles.thumb} />
      </span>
    </button>
  );
}
