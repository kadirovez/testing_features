import { ArrowLeft, PanelRight } from "lucide-react";
import type { UUID } from "../../api/types";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { useChatMeta } from "../../hooks/useChatMeta";
import { cx } from "../../utils/cx";
import { Avatar } from "../shared/Avatar";
import { IconButton } from "../shared/IconButton";
import styles from "./ChatHeader.module.css";

interface ChatHeaderProps {
  chatId: UUID;
}

export function ChatHeader({ chatId }: ChatHeaderProps) {
  const { state, dispatch } = useStore();
  const { t } = useLocale();
  const meta = useChatMeta(chatId);
  if (!meta) return null;

  const infoOpen = state.ui.infoOpen;
  const toggleInfo = () => dispatch({ type: "ui/setInfoOpen", open: !infoOpen });

  return (
    <header className={styles.header}>
      <IconButton label={t("common.back")} className={styles.back} onClick={() => dispatch({ type: "ui/closeChat" })}>
        <ArrowLeft size={20} strokeWidth={1.75} />
      </IconButton>
      <button type="button" className={styles.peer} onClick={toggleInfo}>
        <Avatar name={meta.title} seed={meta.avatarSeed} mediaId={meta.avatarMediaId} size="md" />
        <span className={styles.text}>
          <span className={styles.title}>{meta.title}</span>
          <span className={cx(styles.subtitle, (meta.online || meta.isTyping) && styles.accent)}>{meta.subtitle}</span>
        </span>
      </button>
      <div className={styles.tools}>
        <IconButton label={t("info.title")} active={infoOpen} onClick={toggleInfo}>
          <PanelRight size={20} strokeWidth={1.75} />
        </IconButton>
      </div>
    </header>
  );
}
