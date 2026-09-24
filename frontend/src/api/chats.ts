import { config } from "../config";
import { http } from "./client";
import type { ChatMemberRead, ChatRead, Page, UUID } from "./types";

export const chatsApi = {
  list: (cursor?: string) => http.get<Page<ChatRead>>("/chats", { cursor, limit: config.pageSize }),
  get: (chatId: UUID) => http.get<ChatRead>(`/chats/${chatId}`),
  openDirect: (userId: UUID) => http.post<ChatRead>("/chats/direct", { user_id: userId }),
  createGroup: (title: string, memberIds: UUID[]) =>
    http.post<ChatRead>("/chats/group", { title, member_ids: memberIds }),
  members: (chatId: UUID) => http.get<ChatMemberRead[]>(`/chats/${chatId}/members`),
  update: (chatId: UUID, data: { title?: string; description?: string; avatar_media_id?: UUID | null }) =>
    http.patch<ChatRead>(`/chats/${chatId}`, data),
  leave: (chatId: UUID) => http.post<void>(`/chats/${chatId}/leave`),
  dismiss: (chatId: UUID) => http.post<void>(`/chats/${chatId}/dismiss`),
};
