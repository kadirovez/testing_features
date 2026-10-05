import { Moon } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { useTheme } from "../../context/ThemeContext";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLocale();

  return (
    <div className="flex items-center gap-3">
      <Moon className="size-5 shrink-0 text-subtle" strokeWidth={1.75} aria-hidden />
      <Label htmlFor="settings-theme" className="flex-1 cursor-pointer text-sm font-medium text-foreground">
        {t("settings.darkTheme")}
      </Label>
      <Switch id="settings-theme" checked={theme === "dark"} onCheckedChange={toggleTheme} />
    </div>
  );
}
