import { ChevronRight, Loader2 } from "lucide-react";
import { useMemo, useState, type UIEvent } from "react";
import type { UUID } from "../../api/types";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { useChatActions } from "../../hooks/useChatActions";
import { ChatListContextMenu } from "./ChatListContextMenu";
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
  const [menu, setMenu] = useState<{ chatId: UUID; x: number; y: number } | null>(null);

  const ids = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return chats.order;
    return chats.order.filter((id) => {
      const chat = chats.byId[id];
      const name = chat.title ?? (chat.peer ? users.byId[chat.peer.id]?.username : "") ?? "";
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
    if (query) {
      return <p className={styles.placeholder}>{t("chats.noResults")}</p>;
    }
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>{t("chats.emptyTitle")}</p>
        <p className={styles.emptyLead}>{t("chats.emptyLead")}</p>
        <div className={styles.steps} aria-label={t("chats.emptyStepsLabel")}>
          <span className={styles.stepChip}>{t("menu.contacts")}</span>
          <ChevronRight className={styles.stepArrow} size={18} strokeWidth={1.75} aria-hidden />
          <span className={styles.stepChip}>{t("contacts.add")}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.list} onScroll={onScroll} role="list">
        {ids.map((id) => (
          <ChatListItem
            key={id}
            chatId={id}
            active={state.ui.activeChatId === id}
            onSelect={() => void actions.openChat(id)}
            onContextMenu={(event) => {
              event.preventDefault();
              setMenu({ chatId: id, x: event.clientX, y: event.clientY });
            }}
          />
        ))}
      </div>
      <ChatListContextMenu
        chatId={menu?.chatId ?? null}
        x={menu?.x ?? 0}
        y={menu?.y ?? 0}
        onClose={() => setMenu(null)}
      />
    </>
  );
}
