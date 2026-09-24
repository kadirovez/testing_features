import { Languages } from "lucide-react";
import { useLocale } from "../../../context/LocaleContext";
import { isLocale, LOCALES } from "../../../i18n";
import styles from "./settings.module.css";

export function LanguageSelect() {
  const { locale, setLocale, t } = useLocale();

  return (
    <label className={styles.selectRow}>
      <Languages size={20} strokeWidth={1.75} className={styles.rowIcon} aria-hidden />
      <select
        className={styles.select}
        aria-label={t("settings.language")}
        value={locale}
        onChange={(e) => isLocale(e.target.value) && setLocale(e.target.value)}
      >
        {Object.entries(LOCALES).map(([code, { label }]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
