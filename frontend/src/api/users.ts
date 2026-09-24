import { http } from "./client";
import type { ContactRead, Page, UserPublicRead, UserRead, UserUpdate, UUID } from "./types";

export const usersApi = {
  me: () => http.get<UserRead>("/users/me"),
  updateMe: (data: UserUpdate) => http.patch<UserRead>("/users/me", data),
  setAvatar: (mediaId: UUID) => http.put<UserRead>("/users/me/avatar", { media_id: mediaId }),
  removeAvatar: () => http.delete<UserRead>("/users/me/avatar"),
  get: (userId: UUID) => http.get<UserPublicRead>(`/users/${userId}`),
  search: (q: string, cursor?: string) => http.get<Page<UserPublicRead>>("/users/search", { q, cursor }),
  contacts: (cursor?: string) => http.get<Page<ContactRead>>("/contacts", { cursor }),
  addContact: (userId: UUID, alias?: string) => http.post<ContactRead>("/contacts", { user_id: userId, alias }),
  removeContact: (userId: UUID) => http.delete(`/contacts/${userId}`),
};
