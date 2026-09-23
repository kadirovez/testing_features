// Mirrors backend/app/modules/realtime/schemas.py.
import type { ISODate, MessageRead, UUID } from "../api/types";

export const WSEventType = {
  CHAT_UPDATED: "chat_updated",
  ERROR: "error",
  MEDIA_READY: "media_ready",
  MEMBER_ADDED: "member_added",
  MEMBER_REMOVED: "member_removed",
  MESSAGE_DELETED: "message_deleted",
  MESSAGE_DELIVERED: "message_delivered",
  MESSAGE_NEW: "message_new",
  MESSAGE_READ: "message_read",
  MESSAGE_UPDATED: "message_updated",
  PING: "ping",
  PONG: "pong",
  PRESENCE: "presence",
  SESSION_REVOKED: "session_revoked",
  TYPING: "typing",
  TYPING_START: "typing_start",
  TYPING_STOP: "typing_stop",
} as const;

export type WSEventType = (typeof WSEventType)[keyof typeof WSEventType];

export interface MessageReceiptPayload {
  chat_id: UUID;
  user_id: UUID;
  message_ids: UUID[];
  at: ISODate;
}

export interface OutgoingPayloads {
  chat_updated: { chat_id: UUID; deleted: boolean };
  error: { code: string; message: string };
  media_ready: { media_id: UUID; status: string };
  member_added: { chat_id: UUID; user_ids: UUID[] };
  member_removed: { chat_id: UUID; user_ids: UUID[] };
  message_deleted: { chat_id: UUID; message_id: UUID };
  message_delivered: MessageReceiptPayload;
  message_new: { message: MessageRead };
  message_read: MessageReceiptPayload;
  message_updated: { message: MessageRead };
  pong: Record<string, never>;
  presence: { user_id: UUID; online: boolean; last_seen_at: ISODate | null };
  session_revoked: { session_id: UUID };
  typing: { chat_id: UUID; user_id: UUID; is_typing: boolean };
}

export type ServerEventType = keyof OutgoingPayloads;

export interface ServerEvent<K extends ServerEventType = ServerEventType> {
  type: K;
  payload: OutgoingPayloads[K];
}

export type ClientEvent =
  | { type: typeof WSEventType.PING; payload: Record<string, never> }
  | { type: typeof WSEventType.TYPING_START | typeof WSEventType.TYPING_STOP; payload: { chat_id: UUID } }
  | { type: typeof WSEventType.MESSAGE_DELIVERED; payload: { message_ids: UUID[] } }
  | { type: typeof WSEventType.MESSAGE_READ; payload: { chat_id: UUID; up_to_message_id: UUID } };
