import { useEffect, useRef } from "react";
import { chatsApi } from "../api/chats";
import { mediaApi } from "../api/media";
import { useLocale } from "../context/LocaleContext";
import { useStore } from "../context/StoreContext";
import { onEvent } from "../realtime/registry";
import { realtime } from "../realtime/socket";
import type { ChatActions } from "./useChatActions";

const TYPING_TTL_MS = 6000;

/** Connects the socket and routes server events into the store. */
export function useRealtimeSync(actions: ChatActions): void {
  const { state, dispatch } = useStore();
  const { locale } = useLocale();
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    realtime.connect(locale);
    return () => realtime.disconnect();
  }, [locale]);

  useEffect(() => {
    const typingTimers = new Map<string, number>();
    const meId = () => stateRef.current.users.me?.id;

    const unsubscribe = [
      onEvent("message_new", async ({ message }) => {
        await actions.ensureChat(message.chat_id);
        const isActive = stateRef.current.ui.activeChatId === message.chat_id;
        const isOwn = message.sender_id === meId();
        dispatch({ type: "messages/upserted", message });
        dispatch({ type: "chats/messageArrived", message, incrementUnread: !isOwn && !isActive });
        if (!isOwn && message.sender_id) {
          dispatch({ type: "users/typing", chatId: message.chat_id, userId: message.sender_id, isTyping: false });
          realtime.send({ type: "message_delivered", payload: { message_ids: [message.id] } });
        }
        if (isActive && !isOwn && document.visibilityState === "visible") {
          realtime.send({ type: "message_read", payload: { chat_id: message.chat_id, up_to_message_id: message.id } });
        }
      }),
      onEvent("message_updated", ({ message }) => dispatch({ type: "messages/upserted", message })),
      onEvent("media_ready", ({ media_id }) => {
        void mediaApi.get(media_id).then((media) => dispatch({ type: "messages/mediaPatched", media }));
      }),
      onEvent("message_deleted", ({ chat_id, message_id }) =>
        dispatch({ type: "messages/removed", chatId: chat_id, messageId: message_id }),
      ),
      onEvent("message_delivered", ({ user_id, message_ids }) => {
        if (user_id !== meId()) dispatch({ type: "messages/status", messageIds: message_ids, status: "delivered" });
      }),
      onEvent("message_read", ({ user_id, message_ids }) => {
        if (user_id !== meId()) dispatch({ type: "messages/status", messageIds: message_ids, status: "read" });
      }),
      onEvent("presence", ({ user_id, online, last_seen_at }) =>
        dispatch({ type: "users/presence", userId: user_id, presence: { online, lastSeenAt: last_seen_at } }),
      ),
      onEvent("typing", ({ chat_id, user_id, is_typing }) => {
        const key = `${chat_id}:${user_id}`;
        window.clearTimeout(typingTimers.get(key));
        dispatch({ type: "users/typing", chatId: chat_id, userId: user_id, isTyping: is_typing });
        if (is_typing) {
          const clear = () => dispatch({ type: "users/typing", chatId: chat_id, userId: user_id, isTyping: false });
          typingTimers.set(key, window.setTimeout(clear, TYPING_TTL_MS));
        }
      }),
      onEvent("chat_updated", async ({ chat_id, deleted }) => {
        if (deleted) {
          dispatch({ type: "messages/chatCleared", chatId: chat_id });
          dispatch({ type: "chats/removed", chatId: chat_id });
          if (stateRef.current.ui.activeChatId === chat_id) dispatch({ type: "ui/closeChat" });
          return;
        }
        dispatch({ type: "chats/upserted", chat: await chatsApi.get(chat_id) });
      }),
      onEvent("member_added", async ({ chat_id }) => {
        if (stateRef.current.users.members[chat_id]) {
          dispatch({ type: "users/members", chatId: chat_id, members: await chatsApi.members(chat_id) });
        }
      }),
      onEvent("member_removed", async ({ chat_id, user_ids }) => {
        const me = meId();
        if (me && user_ids.includes(me)) {
          dispatch({ type: "messages/chatCleared", chatId: chat_id });
          dispatch({ type: "chats/removed", chatId: chat_id });
          return;
        }
        if (stateRef.current.users.members[chat_id]) {
          dispatch({ type: "users/members", chatId: chat_id, members: await chatsApi.members(chat_id) });
        }
      }),
    ];

    return () => {
      unsubscribe.forEach((off) => off());
      typingTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [actions, dispatch]);
}
