import type { ChatRead, MessageRead, UUID } from "../api/types";

export interface ChatsState {
  byId: Record<UUID, ChatRead>;
  order: UUID[];
  lastMessage: Record<UUID, MessageRead | undefined>;
  nextCursor: string | null;
  loaded: boolean;
}

export type ChatsAction =
  | { type: "chats/loaded"; chats: ChatRead[]; nextCursor: string | null; append: boolean }
  | { type: "chats/upserted"; chat: ChatRead }
  | { type: "chats/removed"; chatId: UUID }
  | { type: "chats/lastMessage"; chatId: UUID; message: MessageRead | undefined }
  | { type: "chats/unreadReset"; chatId: UUID }
  | { type: "chats/messageArrived"; message: MessageRead; incrementUnread: boolean };

export const initialChatsState: ChatsState = { byId: {}, order: [], lastMessage: {}, nextCursor: null, loaded: false };

function sortOrder(byId: Record<UUID, ChatRead>): UUID[] {
  return Object.values(byId)
    .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at))
    .map((chat) => chat.id);
}

export function chatsReducer(state: ChatsState, action: ChatsAction): ChatsState {
  switch (action.type) {
    case "chats/loaded": {
      const byId = action.append ? { ...state.byId } : {};
      action.chats.forEach((chat) => (byId[chat.id] = chat));
      return { ...state, byId, order: sortOrder(byId), nextCursor: action.nextCursor, loaded: true };
    }
    case "chats/upserted": {
      const byId = { ...state.byId, [action.chat.id]: action.chat };
      return { ...state, byId, order: sortOrder(byId) };
    }
    case "chats/removed": {
      const byId = { ...state.byId };
      delete byId[action.chatId];
      return { ...state, byId, order: state.order.filter((id) => id !== action.chatId) };
    }
    case "chats/lastMessage":
      return { ...state, lastMessage: { ...state.lastMessage, [action.chatId]: action.message } };
    case "chats/unreadReset": {
      const chat = state.byId[action.chatId];
      if (!chat || chat.unread_count === 0) return state;
      return { ...state, byId: { ...state.byId, [chat.id]: { ...chat, unread_count: 0 } } };
    }
    case "chats/messageArrived": {
      const { message } = action;
      const chat = state.byId[message.chat_id];
      if (!chat) return state;
      const updated: ChatRead = {
        ...chat,
        last_message_at: message.created_at,
        unread_count: chat.unread_count + (action.incrementUnread ? 1 : 0),
      };
      const byId = { ...state.byId, [chat.id]: updated };
      return {
        ...state,
        byId,
        order: sortOrder(byId),
        lastMessage: { ...state.lastMessage, [chat.id]: message },
      };
    }
    default:
      return state;
  }
}
