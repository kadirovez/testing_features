import { useLocale } from "../../context/LocaleContext";
import { dayLabel } from "../../utils/formatTime";
import styles from "./DayDivider.module.css";

interface DayDividerProps {
  date: string;
}

export function DayDivider({ date }: DayDividerProps) {
  const { t, locale } = useLocale();
  const label = dayLabel(date, locale);
  const text = label.kind === "today" ? t("chat.today") : label.kind === "yesterday" ? t("chat.yesterday") : label.text;

  return (
    <div className={styles.divider}>
      <span className={styles.pill}>{text}</span>
    </div>
  );
}
