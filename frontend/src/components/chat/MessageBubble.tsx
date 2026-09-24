import type { MouseEvent } from "react";
import type { MessageRead } from "../../api/types";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { useLongPress } from "../../hooks/useLongPress";
import { avatarColor } from "../../utils/avatarColor";
import { cx } from "../../utils/cx";
import { formatClock } from "../../utils/formatTime";
import { splitByLinks } from "../../utils/links";
import styles from "./MessageBubble.module.css";
import { MessageMedia } from "./MessageMedia";
import { MessageStatus } from "./MessageStatus";

interface MessageBubbleProps {
  message: MessageRead;
  isOwn: boolean;
  isFirst: boolean;
  isLast: boolean;
  senderName?: string;
  senderSeed?: string;
  onMenu: (message: MessageRead, x: number, y: number) => void;
}

export function MessageBubble({ message, isOwn, isFirst, isLast, senderName, senderSeed, onMenu }: MessageBubbleProps) {
  const { state } = useStore();
  const { t, locale } = useLocale();
  const longPress = useLongPress(() => onMenu(message, 0, 0), true);

  // Browser context menu is suppressed only on the bubble itself.
  const onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    onMenu(message, event.clientX, event.clientY);
  };

  const hasMedia = message.attachments.length > 0;
  const status = state.messages.status[message.id] ?? "sent";

  return (
    <div
      className={cx(
        styles.bubble,
        isOwn ? styles.own : styles.peer,
        isFirst && styles.first,
        isLast && styles.last,
        hasMedia && styles.withMedia,
      )}
      onContextMenu={onContextMenu}
      {...longPress}
    >
      {senderName && (
        <span className={styles.sender} style={{ color: avatarColor(senderSeed ?? senderName) }}>
          {senderName}
        </span>
      )}
      {hasMedia && <MessageMedia attachments={message.attachments} />}
      {message.content && (
        <p className={styles.text}>
          {splitByLinks(message.content).map((part, i) =>
            part.isLink ? (
              <a key={i} href={part.text} target="_blank" rel="noreferrer" className={styles.link}>
                {part.text}
              </a>
            ) : (
              part.text
            ),
          )}
          <span className={styles.spacer} aria-hidden />
        </p>
      )}
      <span className={styles.meta}>
        {message.edited_at && <span>{t("chat.edited")}</span>}
        <time dateTime={message.created_at}>{formatClock(message.created_at, locale)}</time>
        {isOwn && <MessageStatus status={status} className={styles.check} />}
      </span>
    </div>
  );
}
