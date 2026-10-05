import { useLocale } from "../../context/LocaleContext";
import { dayLabel } from "../../utils/formatTime";

interface DayDividerProps {
  date: string;
}

export function DayDivider({ date }: DayDividerProps) {
  const { t, locale } = useLocale();
  const label = dayLabel(date, locale);
  const text = label.kind === "today" ? t("chat.today") : label.kind === "yesterday" ? t("chat.yesterday") : label.text;

  return (
    <div className="sticky top-2 z-[1] my-3 flex justify-center">
      <span className="rounded-full bg-black/30 px-3 py-0.5 text-xs font-medium text-white backdrop-blur-sm">{text}</span>
    </div>
  );
}
