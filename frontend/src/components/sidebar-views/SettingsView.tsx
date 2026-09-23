import { useLocale } from "../../context/LocaleContext";
import { ThemeToggle } from "../shared/ThemeToggle";
import { AvatarPicker } from "./settings/AvatarPicker";
import { LanguageSelect } from "./settings/LanguageSelect";
import { NicknameField } from "./settings/NicknameField";
import { ViewHeader } from "./ViewHeader";
import styles from "./views.module.css";

export function SettingsView() {
  const { t } = useLocale();

  return (
    <>
      <ViewHeader title={t("settings.title")} />
      <div className={styles.scroll}>
        <AvatarPicker />
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t("settings.account")}</h3>
          <NicknameField />
        </section>
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t("settings.appearance")}</h3>
          <ThemeToggle />
          <LanguageSelect />
        </section>
      </div>
    </>
  );
}
