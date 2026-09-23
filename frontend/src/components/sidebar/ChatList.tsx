import { Loader2 } from "lucide-react";
import { useMemo, type UIEvent } from "react";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { useChatActions } from "../../hooks/useChatActions";
import { ChatListItem } from "./ChatListItem";
import styles from "./ChatList.module.css";

const LOAD_MORE_THRESHOLD_PX = 200;

interface ChatListProps {
  query: string;
}

export function ChatList({ query }: ChatListProps) {
  const { state } = useStore();
  const { t } = useLocale();
  const actions = useChatActions();
  const { chats, users } = state;

  const ids = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return chats.order;
    return chats.order.filter((id) => {
      const chat = chats.byId[id];
      const name = chat.title ?? (chat.peer ? users.byId[chat.peer.id]?.display_name : "") ?? "";
      return name.toLowerCase().includes(needle) || chat.peer?.username.toLowerCase().includes(needle);
    });
  }, [query, chats.order, chats.byId, users.byId]);

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < LOAD_MORE_THRESHOLD_PX) void actions.loadChats(true);
  };

  if (!chats.loaded) {
    return (
      <div className={styles.placeholder}>
        <Loader2 size={20} strokeWidth={1.75} className={styles.spinner} />
      </div>
    );
  }

  if (ids.length === 0) {
    return <p className={styles.placeholder}>{query ? t("chats.noResults") : t("chats.empty")}</p>;
  }

  return (
    <div className={styles.list} onScroll={onScroll} role="list">
      {ids.map((id) => (
        <ChatListItem
          key={id}
          chatId={id}
          active={state.ui.activeChatId === id}
          onSelect={() => void actions.openChat(id)}
        />
      ))}
    </div>
  );
}
