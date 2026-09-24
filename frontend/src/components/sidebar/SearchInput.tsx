import { Search, X } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import styles from "./SearchInput.module.css";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchInput({ value, onChange }: SearchInputProps) {
  const { t } = useLocale();

  return (
    <label className={styles.field}>
      <Search size={18} strokeWidth={1.75} className={styles.icon} />
      <input
        className={styles.input}
        type="search"
        value={value}
        placeholder={t("search.placeholder")}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onChange("")}
      />
      {value && (
        <button type="button" className={styles.clear} aria-label={t("common.close")} onClick={() => onChange("")}>
          <X size={16} strokeWidth={2} />
        </button>
      )}
    </label>
  );
}
