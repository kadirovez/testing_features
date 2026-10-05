import { ChevronRight, SearchX } from "lucide-react";
import { useMemo, useState, type UIEvent } from "react";
import type { UUID } from "../../api/types";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { useChatActions } from "../../hooks/useChatActions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatListContextMenu } from "./ChatListContextMenu";
import { ChatListItem } from "./ChatListItem";

const LOAD_MORE_THRESHOLD_PX = 200;
const SKELETON_ROWS = 8;

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
      <div className="flex flex-col gap-1 px-2 pt-1" aria-busy aria-label={t("common.loading")}>
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <div key={i} className="flex h-[68px] items-center gap-3 px-2">
            <Skeleton className="size-12 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (ids.length === 0) {
    if (query) {
      return (
        <div className="flex flex-col items-center gap-2 px-6 pt-12 text-center text-sm text-muted-foreground">
          <SearchX className="size-6 text-subtle" strokeWidth={1.5} />
          {t("chats.noResults")}
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-2 px-6 pt-14 text-center">
        <p className="text-[15px] font-semibold">{t("chats.emptyTitle")}</p>
        <p className="max-w-64 text-sm text-muted-foreground">{t("chats.emptyLead")}</p>
        <div className="mt-2 flex items-center gap-1.5" aria-label={t("chats.emptyStepsLabel")}>
          <span className="rounded-full bg-muted px-3 py-1 text-[13px] font-medium">{t("menu.contacts")}</span>
          <ChevronRight className="size-4 text-subtle" strokeWidth={1.75} aria-hidden />
          <span className="rounded-full bg-muted px-3 py-1 text-[13px] font-medium">{t("contacts.add")}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="min-h-0 flex-1" onViewportScroll={onScroll}>
        <div className="flex flex-col gap-px px-2 pb-2">
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
      </ScrollArea>
      <ChatListContextMenu
        chatId={menu?.chatId ?? null}
        x={menu?.x ?? 0}
        y={menu?.y ?? 0}
        onClose={() => setMenu(null)}
      />
    </>
  );
}
