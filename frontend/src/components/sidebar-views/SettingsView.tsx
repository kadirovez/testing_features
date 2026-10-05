import { useLocale } from "../../context/LocaleContext";
import { ThemeToggle } from "../shared/ThemeToggle";
import { AvatarPicker } from "./settings/AvatarPicker";
import { AccentPicker } from "./settings/AccentPicker";
import { ChatWallpaperPicker } from "./settings/ChatWallpaperPicker";
import { LanguageSelect } from "./settings/LanguageSelect";
import { UsernameField } from "./settings/UsernameField";
import { ViewHeader } from "./ViewHeader";

export function SettingsView() {
  const { t } = useLocale();

  return (
    <>
      <ViewHeader title={t("settings.title")} />
      <div className="min-h-0 flex-1 overflow-y-auto pb-6">
        <AvatarPicker />
        <section className="border-t px-4 py-4">
          <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("settings.account")}</h3>
          <UsernameField />
        </section>
        <section className="border-t px-4 py-4">
          <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("settings.appearance")}</h3>
          <div className="flex flex-col gap-5">
            <ThemeToggle />
            <AccentPicker />
            <ChatWallpaperPicker />
          </div>
        </section>
        <section className="border-t px-4 py-4">
          <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("settings.language")}</h3>
          <LanguageSelect />
        </section>
      </div>
    </>
  );
}
