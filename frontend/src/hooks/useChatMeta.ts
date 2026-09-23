import type { ChatRead, UUID } from "../api/types";
import { useLocale } from "../context/LocaleContext";
import { useStore } from "../context/StoreContext";
import type { KnownUser } from "../store/usersSlice";
import { formatLastSeen } from "../utils/formatTime";

export interface ChatMeta {
  chat: ChatRead;
  title: string;
  avatarMediaId: UUID | null;
  avatarSeed: string;
  peer: KnownUser | null;
  online: boolean;
  subtitle: string;
  isTyping: boolean;
}

/** Derived display data for a chat: title, avatar, presence line. */
export function useChatMeta(chatId: UUID | null): ChatMeta | null {
  const { state } = useStore();
  const { t, locale } = useLocale();
  const chat = chatId ? state.chats.byId[chatId] : undefined;
  if (!chat) return null;

  const peer = chat.peer ? (state.users.byId[chat.peer.id] ?? chat.peer) : null;
  const presence = peer ? state.users.presence[peer.id] : undefined;
  const online = presence?.online ?? false;
  const lastSeen = presence?.lastSeenAt ?? peer?.last_seen_at ?? null;
  const isTyping = (state.users.typing[chat.id] ?? []).length > 0;

  let subtitle: string;
  if (isTyping) subtitle = t("chat.typing");
  else if (chat.type === "group") subtitle = t("chat.members", { count: state.users.members[chat.id]?.length ?? "…" });
  else if (online) subtitle = t("chat.online");
  else if (lastSeen) subtitle = t("chat.lastSeen", { time: formatLastSeen(lastSeen, locale) });
  else subtitle = t("chat.offline");

  return {
    chat,
    title: chat.title ?? peer?.display_name ?? "",
    avatarMediaId: chat.avatar_media_id ?? peer?.avatar_media_id ?? null,
    avatarSeed: peer?.id ?? chat.id,
    peer,
    online,
    subtitle,
    isTyping,
  };
}
