import { AtSign, Info, Mail } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { Avatar } from "../shared/Avatar";
import { InfoRow } from "../shared/InfoRow";
import { ViewHeader } from "./ViewHeader";
import styles from "./views.module.css";

export function ProfileView() {
  const { state } = useStore();
  const { t } = useLocale();
  const me = state.users.me;
  if (!me) return null;

  return (
    <>
      <ViewHeader title={t("profile.title")} />
      <div className={styles.scroll}>
        <div className={styles.hero}>
          <Avatar name={me.display_name} seed={me.id} mediaId={me.avatar_media_id} size="xl" />
          <h3 className={styles.heroName}>{me.display_name}</h3>
          <span className={styles.heroSub}>{t("chat.online")}</span>
        </div>
        <div className={styles.section}>
          <InfoRow icon={AtSign} value={`@${me.username}`} label={t("info.username")} />
          <InfoRow icon={Mail} value={me.email} label={t("profile.email")} />
          {me.bio && <InfoRow icon={Info} value={me.bio} label={t("info.bio")} />}
        </div>
      </div>
    </>
  );
}
