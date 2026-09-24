import { useCallback, useMemo, useRef } from "react";
import { config } from "../config";
import { chatsApi } from "../api/chats";
import { mediaApi } from "../api/media";
import { messagesApi } from "../api/messages";
import type { ChatRead, MessageRead, UUID } from "../api/types";
import { usersApi } from "../api/users";
import { useStore } from "../context/StoreContext";

export function useChatActions() {
  const { state, dispatch } = useStore();
  const stateRef = useRef(state);
  stateRef.current = state;

  const rememberPeers = useCallback(
    (chats: ChatRead[]) => {
      const peers = chats.flatMap((chat) => (chat.peer ? [chat.peer] : []));
      if (peers.length) dispatch({ type: "users/known", users: peers });
    },
    [dispatch],
  );

  const loadPreviews = useCallback(
    (chats: ChatRead[]) =>
      Promise.all(
        chats.map(async (chat) => {
          const page = await messagesApi.list(chat.id, undefined, 1);
          dispatch({ type: "chats/lastMessage", chatId: chat.id, message: page.items[0] });
        }),
      ),
    [dispatch],
  );

  const loadChats = useCallback(
    async (more = false) => {
      const cursor = more ? (stateRef.current.chats.nextCursor ?? undefined) : undefined;
      if (more && !cursor) return;
      const page = await chatsApi.list(cursor);
      dispatch({ type: "chats/loaded", chats: page.items, nextCursor: page.next_cursor, append: more });
      rememberPeers(page.items);
      await loadPreviews(page.items);
    },
    [dispatch, rememberPeers, loadPreviews],
  );

  const ensureChat = useCallback(
    async (chatId: UUID) => {
      if (stateRef.current.chats.byId[chatId]) return;
      const chat = await chatsApi.get(chatId);
      dispatch({ type: "chats/upserted", chat });
      rememberPeers([chat]);
    },
    [dispatch, rememberPeers],
  );

  const markRead = useCallback(
    async (chatId: UUID) => {
      const { chats, messages, users } = stateRef.current;
      const ids = messages.byChat[chatId]?.ids ?? [];
      const lastIncoming = [...ids].reverse().find((id) => messages.byId[id].sender_id !== users.me?.id);
      if (!lastIncoming || !chats.byId[chatId]?.unread_count) return;
      dispatch({ type: "chats/unreadReset", chatId });
      await messagesApi.markRead(chatId, lastIncoming);
    },
    [dispatch],
  );

  // Receipts are cumulative, so the status of the latest own message applies to earlier ones.
  const loadOwnStatuses = useCallback(
    async (timeline: MessageRead[]) => {
      const meId = stateRef.current.users.me?.id;
      const own = timeline.filter((m) => m.sender_id === meId);
      const latest = own[own.length - 1];
      if (!latest) return;
      const statuses = await messagesApi.statuses(latest.id);
      const status = statuses.some((s) => s.status === "read")
        ? "read"
        : statuses.some((s) => s.status === "delivered")
          ? "delivered"
          : "sent";
      dispatch({ type: "messages/status", messageIds: own.map((m) => m.id), status });
    },
    [dispatch],
  );

  const loadHistory = useCallback(
    async (chatId: UUID, more = false) => {
      const timeline = stateRef.current.messages.byChat[chatId];
      if (more && !timeline?.nextCursor) return;
      const page = await messagesApi.list(chatId, more ? (timeline?.nextCursor ?? undefined) : undefined);
      dispatch({ type: "messages/pageLoaded", chatId, messages: page.items, nextCursor: page.next_cursor });
      if (!more) await loadOwnStatuses([...page.items].reverse());
    },
    [dispatch, loadOwnStatuses],
  );

  const loadParticipants = useCallback(
    async (chat: ChatRead) => {
      if (chat.type === "group") {
        dispatch({ type: "users/members", chatId: chat.id, members: await chatsApi.members(chat.id) });
      } else if (chat.peer) {
        dispatch({ type: "users/known", users: [await usersApi.get(chat.peer.id)] });
      }
    },
    [dispatch],
  );

  const openChat = useCallback(
    async (chatId: UUID) => {
      dispatch({ type: "ui/openChat", chatId });
      const chat = stateRef.current.chats.byId[chatId];
      if (chat) void loadParticipants(chat);
      if (!stateRef.current.messages.byChat[chatId]?.loaded) await loadHistory(chatId);
      await markRead(chatId);
    },
    [dispatch, loadHistory, loadParticipants, markRead],
  );

  const openDirectWith = useCallback(
    async (userId: UUID) => {
      const chat = await chatsApi.openDirect(userId);
      dispatch({ type: "chats/upserted", chat });
      rememberPeers([chat]);
      await openChat(chat.id);
    },
    [dispatch, openChat, rememberPeers],
  );

  const sendMessage = useCallback(
    async (chatId: UUID, content: string) => {
      const message = await messagesApi.send(chatId, { content, client_message_id: crypto.randomUUID() });
      dispatch({ type: "messages/upserted", message });
      dispatch({ type: "chats/messageArrived", message, incrementUnread: false });
    },
    [dispatch],
  );

  const sendImages = useCallback(
    async (chatId: UUID, files: File[]) => {
      if (files.length === 0) return;
      const clientMessageId = crypto.randomUUID();
      const reserved = await Promise.all(files.map((file) => mediaApi.reserve(file, "message")));
      const mediaIds = reserved.map((item) => item.media.id);
      const message = await messagesApi.send(chatId, { media_ids: mediaIds, client_message_id: clientMessageId });
      dispatch({ type: "messages/upserted", message });
      dispatch({ type: "chats/messageArrived", message, incrementUnread: false });

      void Promise.all(
        reserved.map(async (upload, index) => {
          if (!config.useMocks) await mediaApi.putContent(upload.media.id, files[index]);
          const media = await mediaApi.complete(upload.media.id);
          dispatch({ type: "messages/mediaPatched", media });
        }),
      ).catch(() => {
        /* upload errors surface on next refresh; failed media stays in processing/pending state */
      });
    },
    [dispatch],
  );

  const createGroup = useCallback(
    async (title: string, memberIds: UUID[]) => {
      const chat = await chatsApi.createGroup(title, memberIds);
      dispatch({ type: "chats/upserted", chat });
      await openChat(chat.id);
      dispatch({ type: "ui/setInfoOpen", open: true });
    },
    [dispatch, openChat],
  );

  const dismissChat = useCallback(
    async (chatId: UUID) => {
      await chatsApi.dismiss(chatId);
      dispatch({ type: "messages/chatCleared", chatId });
      dispatch({ type: "chats/removed", chatId });
      if (stateRef.current.ui.activeChatId === chatId) {
        dispatch({ type: "ui/closeChat" });
      }
    },
    [dispatch],
  );

  const deleteMessage = useCallback(
    async (message: MessageRead) => {
      await messagesApi.remove(message.id);
      dispatch({ type: "messages/removed", chatId: message.chat_id, messageId: message.id });
      const ids = stateRef.current.messages.byChat[message.chat_id]?.ids ?? [];
      const last = ids.filter((id) => id !== message.id).pop();
      dispatch({
        type: "chats/lastMessage",
        chatId: message.chat_id,
        message: last ? stateRef.current.messages.byId[last] : undefined,
      });
    },
    [dispatch],
  );

  return useMemo(
    () => ({
      loadChats,
      ensureChat,
      openChat,
      openDirectWith,
      loadHistory,
      sendMessage,
      sendImages,
      deleteMessage,
      createGroup,
      dismissChat,
      markRead,
    }),
    [loadChats, ensureChat, openChat, openDirectWith, loadHistory, sendMessage, sendImages, createGroup, deleteMessage, dismissChat, markRead],
  );
}

export type ChatActions = ReturnType<typeof useChatActions>;
