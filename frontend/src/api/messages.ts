import { config } from "../config";
import { http } from "./client";
import type { MessageCreate, MessageRead, MessageStatusRead, Page, UUID } from "./types";

export const messagesApi = {
  list: (chatId: UUID, cursor?: string, limit: number = config.pageSize) =>
    http.get<Page<MessageRead>>(`/chats/${chatId}/messages`, { cursor, limit }),
  send: (chatId: UUID, data: MessageCreate) => http.post<MessageRead>(`/chats/${chatId}/messages`, data),
  edit: (messageId: UUID, content: string) => http.patch<MessageRead>(`/messages/${messageId}`, { content }),
  remove: (messageId: UUID) => http.delete(`/messages/${messageId}`),
  markRead: (chatId: UUID, upToMessageId: UUID) =>
    http.post<void>(`/chats/${chatId}/read`, { up_to_message_id: upToMessageId }),
  statuses: (messageId: UUID) => http.get<MessageStatusRead[]>(`/messages/${messageId}/statuses`),
};
