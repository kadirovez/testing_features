import { MessagesSquare } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import styles from "./EmptyChat.module.css";

export function EmptyChat() {
  const { t } = useLocale();
  return (
    <div className={styles.root}>
      <span className={styles.pill}>
        <MessagesSquare size={18} strokeWidth={1.75} />
        {t("chat.selectPrompt")}
      </span>
    </div>
  );
}
