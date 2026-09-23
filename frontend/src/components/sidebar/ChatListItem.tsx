import type { MessageRead, UUID } from "../../api/types";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { useChatMeta } from "../../hooks/useChatMeta";
import type { TranslationKey } from "../../i18n";
import { cx } from "../../utils/cx";
import { formatListTime } from "../../utils/formatTime";
import { MessageStatus } from "../chat/MessageStatus";
import { Avatar } from "../shared/Avatar";
import styles from "./ChatListItem.module.css";

interface ChatListItemProps {
  chatId: UUID;
  active: boolean;
  onSelect: () => void;
}

function previewText(message: MessageRead | undefined, t: (key: TranslationKey) => string): string {
  if (!message) return "";
  if (message.is_deleted) return t("chats.deleted");
  if (message.type === "system") return message.system_text ?? "";
  if (message.content) return message.content;
  return message.type === "video" ? t("chats.video") : t("chats.photo");
}

export function ChatListItem({ chatId, active, onSelect }: ChatListItemProps) {
  const { state } = useStore();
  const { t, locale } = useLocale();
  const meta = useChatMeta(chatId);
  if (!meta) return null;

  const { chat } = meta;
  const last = state.chats.lastMessage[chatId];
  const meId = state.users.me?.id;
  const isOwn = last?.sender_id === meId;
  const sender =
    chat.type === "group" && last?.sender_id && last.type !== "system"
      ? isOwn
        ? t("chats.you")
        : state.users.byId[last.sender_id]?.display_name.split(" ")[0]
      : null;

  return (
    <button type="button" role="listitem" className={cx(styles.item, active && styles.active)} onClick={onSelect}>
      <Avatar name={meta.title} seed={meta.avatarSeed} mediaId={meta.avatarMediaId} size="lg" online={meta.online} />
      <span className={styles.body}>
        <span className={styles.row}>
          <span className={styles.title}>{meta.title}</span>
          {isOwn && last && <MessageStatus status={state.messages.status[last.id] ?? "sent"} className={styles.status} />}
          <time className={styles.time}>{formatListTime(last?.created_at ?? chat.last_message_at, locale)}</time>
        </span>
        <span className={styles.row}>
          <span className={cx(styles.preview, meta.isTyping && styles.typing)}>
            {meta.isTyping ? (
              t("chat.typing")
            ) : (
              <>
                {sender && <span className={styles.sender}>{sender}: </span>}
                {previewText(last, t)}
              </>
            )}
          </span>
          {chat.unread_count > 0 && <span className={styles.badge}>{chat.unread_count}</span>}
        </span>
      </span>
    </button>
  );
}
