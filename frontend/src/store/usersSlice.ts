import type { ChatMemberRead, ISODate, UserBrief, UserPublicRead, UserRead, UUID } from "../api/types";

export type KnownUser = UserBrief & Partial<Pick<UserPublicRead, "bio" | "last_seen_at">>;

export interface Presence {
  online: boolean;
  lastSeenAt: ISODate | null;
}

export interface UsersState {
  me: UserRead | null;
  byId: Record<UUID, KnownUser>;
  presence: Record<UUID, Presence>;
  typing: Record<UUID, UUID[]>;
  members: Record<UUID, ChatMemberRead[] | undefined>;
}

export type UsersAction =
  | { type: "users/me"; user: UserRead | null }
  | { type: "users/known"; users: KnownUser[] }
  | { type: "users/presence"; userId: UUID; presence: Presence }
  | { type: "users/typing"; chatId: UUID; userId: UUID; isTyping: boolean }
  | { type: "users/members"; chatId: UUID; members: ChatMemberRead[] };

export const initialUsersState: UsersState = { me: null, byId: {}, presence: {}, typing: {}, members: {} };

function mergeUsers(byId: Record<UUID, KnownUser>, users: KnownUser[]): Record<UUID, KnownUser> {
  const next = { ...byId };
  users.forEach((user) => (next[user.id] = { ...next[user.id], ...user }));
  return next;
}

export function usersReducer(state: UsersState, action: UsersAction): UsersState {
  switch (action.type) {
    case "users/me":
      return {
        ...state,
        me: action.user,
        byId: action.user ? mergeUsers(state.byId, [action.user]) : state.byId,
      };
    case "users/known":
      return { ...state, byId: mergeUsers(state.byId, action.users) };
    case "users/presence":
      return { ...state, presence: { ...state.presence, [action.userId]: action.presence } };
    case "users/typing": {
      const current = state.typing[action.chatId] ?? [];
      const next = action.isTyping
        ? [...new Set([...current, action.userId])]
        : current.filter((id) => id !== action.userId);
      return { ...state, typing: { ...state.typing, [action.chatId]: next } };
    }
    case "users/members":
      return {
        ...state,
        members: { ...state.members, [action.chatId]: action.members },
        byId: mergeUsers(state.byId, action.members.map((m) => m.user)),
      };
    default:
      return state;
  }
}
