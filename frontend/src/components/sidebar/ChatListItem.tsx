import type { MessageRead, UUID } from "../../api/types";
import type { MouseEvent } from "react";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { useChatMeta } from "../../hooks/useChatMeta";
import type { TranslationKey } from "../../i18n";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { formatListTime } from "../../utils/formatTime";
import { MessageStatus } from "../chat/MessageStatus";
import { Avatar } from "../shared/Avatar";

interface ChatListItemProps {
  chatId: UUID;
  active: boolean;
  onSelect: () => void;
  onContextMenu: (event: MouseEvent<HTMLButtonElement>) => void;
}

function previewText(message: MessageRead | undefined, t: (key: TranslationKey) => string): string {
  if (!message) return "";
  if (message.is_deleted) return t("chats.deleted");
  if (message.type === "system") return message.system_text ?? "";
  if (message.content) return message.content;
  return message.type === "video" ? t("chats.video") : t("chats.photo");
}

export function ChatListItem({ chatId, active, onSelect, onContextMenu }: ChatListItemProps) {
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
        : state.users.byId[last.sender_id]?.username
      : null;
  const unread = chat.unread_count > 0;

  return (
    <button
      type="button"
      aria-current={active || undefined}
      className={cn(
        "group flex h-16 w-full items-center gap-3 rounded-md px-2 text-left transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
      )}
      onClick={onSelect}
      onContextMenu={onContextMenu}
    >
      <Avatar
        name={meta.title}
        seed={meta.avatarSeed}
        mediaId={meta.avatarMediaId}
        size="lg"
        online={meta.online}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={cn("min-w-0 flex-1 truncate text-sm", unread ? "font-semibold" : "font-medium")}>
            {meta.title}
          </span>
          {isOwn && last && (
            <MessageStatus
              status={state.messages.status[last.id] ?? "sent"}
              className="text-muted-foreground"
            />
          )}
          <time
            className={cn(
              "shrink-0 text-xs tabular-nums",
              unread ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {formatListTime(last?.created_at ?? chat.last_message_at, locale)}
          </time>
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-sm",
              meta.isTyping ? "text-primary" : "text-muted-foreground",
            )}
          >
            {meta.isTyping ? (
              t("chat.typing")
            ) : (
              <>
                {sender && (
                  <span className="font-medium text-foreground">
                    {sender}:{" "}
                  </span>
                )}
                {previewText(last, t)}
              </>
            )}
          </span>
          {unread && (
            <Badge>{chat.unread_count}</Badge>
          )}
        </span>
      </span>
    </button>
  );
}
