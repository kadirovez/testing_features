import type { MessageRead } from "../../api/types";
import { useStore } from "../../context/StoreContext";
import type { MessageGroup as Group } from "../../utils/groupMessages";
import { cx } from "../../utils/cx";
import { Avatar } from "../shared/Avatar";
import { MessageBubble } from "./MessageBubble";
import styles from "./MessageGroup.module.css";

interface MessageGroupProps {
  group: Group;
  showSender: boolean;
  onMenu: (message: MessageRead, x: number, y: number) => void;
}

export function MessageGroup({ group, showSender, onMenu }: MessageGroupProps) {
  const { state } = useStore();
  const isOwn = group.senderId === state.users.me?.id;
  const sender = group.senderId ? state.users.byId[group.senderId] : undefined;

  if (group.isSystem) {
    return (
      <div className={styles.system}>
        {group.messages.map((m) => (
          <span key={m.id} className={styles.systemPill}>
            {m.system_text}
          </span>
        ))}
      </div>
    );
  }

  const withAvatar = showSender && !isOwn;

  return (
    <div className={cx(styles.group, isOwn ? styles.own : styles.peer)}>
      {withAvatar && (
        <div className={styles.avatarSlot}>
          <Avatar
            name={sender?.username ?? "?"}
            seed={group.senderId ?? group.key}
            mediaId={sender?.avatar_media_id}
            size="sm"
            className={styles.avatar}
          />
        </div>
      )}
      <div className={styles.stack}>
        {group.messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={isOwn}
            isFirst={index === 0}
            isLast={index === group.messages.length - 1}
            senderName={withAvatar && index === 0 ? sender?.username : undefined}
            senderSeed={group.senderId ?? undefined}
            onMenu={onMenu}
          />
        ))}
      </div>
    </div>
  );
}
