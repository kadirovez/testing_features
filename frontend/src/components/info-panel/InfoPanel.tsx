import { AtSign, Info, X } from "lucide-react";
import { useMemo, useRef } from "react";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { useChatMeta } from "../../hooks/useChatMeta";
import { InfoRow } from "../shared/InfoRow";
import { Avatar } from "../shared/Avatar";
import { IconButton } from "../shared/IconButton";
import styles from "./InfoPanel.module.css";
import { InfoTabs } from "./InfoTabs";

export function InfoPanel() {
  const { state, dispatch } = useStore();
  const { t } = useLocale();
  // Keep showing the last chat while the panel slides out.
  const lastChatId = useRef(state.ui.activeChatId);
  if (state.ui.activeChatId) lastChatId.current = state.ui.activeChatId;
  const meta = useChatMeta(lastChatId.current);

  const timeline = meta ? state.messages.byChat[meta.chat.id] : undefined;
  const messages = useMemo(
    () => (timeline?.ids ?? []).map((id) => state.messages.byId[id]).filter((m) => !m.is_deleted),
    [timeline?.ids, state.messages.byId],
  );

  if (!meta) return null;
  const about = meta.chat.type === "group" ? meta.chat.description : meta.peer?.bio;

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <IconButton label={t("common.close")} onClick={() => dispatch({ type: "ui/setInfoOpen", open: false })}>
          <X size={20} strokeWidth={1.75} />
        </IconButton>
        <h2 className={styles.heading}>{t("info.title")}</h2>
      </header>
      <div className={styles.scroll}>
        <div className={styles.hero}>
          <Avatar name={meta.title} seed={meta.avatarSeed} mediaId={meta.avatarMediaId} size="xl" online={meta.online} />
          <h3 className={styles.name}>{meta.title}</h3>
          <span className={styles.status}>{meta.subtitle}</span>
        </div>
        <div className={styles.details}>
          {meta.peer && <InfoRow icon={AtSign} value={`@${meta.peer.username}`} label={t("info.username")} />}
          {about && (
            <InfoRow icon={Info} value={about} label={meta.chat.type === "group" ? t("info.description") : t("info.bio")} />
          )}
        </div>
        <InfoTabs messages={messages} />
      </div>
    </div>
  );
}
