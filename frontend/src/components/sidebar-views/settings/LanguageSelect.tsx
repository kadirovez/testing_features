import { Languages } from "lucide-react";
import { useLocale } from "../../../context/LocaleContext";
import { isLocale, LOCALES } from "../../../i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function LanguageSelect() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="flex items-center gap-3">
      <Languages className="size-5 shrink-0 text-subtle" strokeWidth={1.75} aria-hidden />
      <Select value={locale} onValueChange={(value) => isLocale(value) && setLocale(value)}>
        <SelectTrigger aria-label={t("settings.language")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(LOCALES).map(([code, { label }]) => (
            <SelectItem key={code} value={code}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
