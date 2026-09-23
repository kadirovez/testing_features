import type { DeliveryStatus, MediaBrief, MessageRead, UUID } from "../api/types";

export interface ChatTimeline {
  ids: UUID[];
  nextCursor: string | null;
  loaded: boolean;
}

export interface MessagesState {
  byId: Record<UUID, MessageRead>;
  byChat: Record<UUID, ChatTimeline | undefined>;
  status: Record<UUID, DeliveryStatus>;
}

export type MessagesAction =
  | { type: "messages/pageLoaded"; chatId: UUID; messages: MessageRead[]; nextCursor: string | null }
  | { type: "messages/upserted"; message: MessageRead }
  | { type: "messages/removed"; chatId: UUID; messageId: UUID }
  | { type: "messages/status"; messageIds: UUID[]; status: DeliveryStatus }
  | { type: "messages/mediaPatched"; media: MediaBrief };

export const initialMessagesState: MessagesState = { byId: {}, byChat: {}, status: {} };

const STATUS_RANK: Record<DeliveryStatus, number> = { sent: 0, delivered: 1, read: 2 };

function sortIds(ids: Iterable<UUID>, byId: Record<UUID, MessageRead>): UUID[] {
  return [...new Set(ids)].sort((a, b) => byId[a].created_at.localeCompare(byId[b].created_at));
}

function timelineIds(ids: Iterable<UUID>, byId: Record<UUID, MessageRead>): UUID[] {
  return sortIds(
    [...ids].filter((id) => {
      const message = byId[id];
      return message !== undefined && !message.is_deleted;
    }),
    byId,
  );
}

export function messagesReducer(state: MessagesState, action: MessagesAction): MessagesState {
  switch (action.type) {
    case "messages/pageLoaded": {
      const byId = { ...state.byId };
      action.messages.forEach((m) => (byId[m.id] = m));
      const prev = state.byChat[action.chatId];
      const ids = timelineIds([...action.messages.map((m) => m.id), ...(prev?.ids ?? [])], byId);
      return {
        ...state,
        byId,
        byChat: { ...state.byChat, [action.chatId]: { ids, nextCursor: action.nextCursor, loaded: true } },
      };
    }
    case "messages/upserted": {
      const { message } = action;
      const byId = { ...state.byId, [message.id]: message };
      const timeline = state.byChat[message.chat_id];
      if (!timeline) return { ...state, byId };
      const ids = message.is_deleted
        ? timeline.ids.filter((id) => id !== message.id)
        : timelineIds([...timeline.ids, message.id], byId);
      return { ...state, byId, byChat: { ...state.byChat, [message.chat_id]: { ...timeline, ids } } };
    }
    case "messages/removed": {
      const timeline = state.byChat[action.chatId];
      const byId = { ...state.byId };
      delete byId[action.messageId];
      if (!timeline) return { ...state, byId };
      const ids = timeline.ids.filter((id) => id !== action.messageId);
      return { ...state, byId, byChat: { ...state.byChat, [action.chatId]: { ...timeline, ids } } };
    }
    case "messages/status": {
      const status = { ...state.status };
      action.messageIds.forEach((id) => {
        const current = status[id] ?? "sent";
        if (STATUS_RANK[action.status] > STATUS_RANK[current]) status[id] = action.status;
      });
      return { ...state, status };
    }
    case "messages/mediaPatched": {
      const byId = { ...state.byId };
      let changed = false;
      for (const message of Object.values(byId)) {
        const index = message.attachments.findIndex((item) => item.id === action.media.id);
        if (index === -1) continue;
        const attachments = [...message.attachments];
        attachments[index] = action.media;
        byId[message.id] = { ...message, attachments };
        changed = true;
      }
      return changed ? { ...state, byId } : state;
    }
    default:
      return state;
  }
}
