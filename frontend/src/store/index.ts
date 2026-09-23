import { chatsReducer, initialChatsState, type ChatsAction, type ChatsState } from "./chatsSlice";
import { initialMessagesState, messagesReducer, type MessagesAction, type MessagesState } from "./messagesSlice";
import { initialUiState, uiReducer, type UiAction, type UiState } from "./uiSlice";
import { initialUsersState, usersReducer, type UsersAction, type UsersState } from "./usersSlice";

export interface RootState {
  chats: ChatsState;
  messages: MessagesState;
  users: UsersState;
  ui: UiState;
}

export type RootAction = ChatsAction | MessagesAction | UsersAction | UiAction | { type: "root/reset" };

export const initialRootState: RootState = {
  chats: initialChatsState,
  messages: initialMessagesState,
  users: initialUsersState,
  ui: initialUiState,
};

// Each slice ignores foreign actions, so adding a slice means one more line here.
export function rootReducer(state: RootState, action: RootAction): RootState {
  if (action.type === "root/reset") return initialRootState;
  const next: RootState = {
    chats: chatsReducer(state.chats, action as ChatsAction),
    messages: messagesReducer(state.messages, action as MessagesAction),
    users: usersReducer(state.users, action as UsersAction),
    ui: uiReducer(state.ui, action as UiAction),
  };
  const changed = (Object.keys(next) as Array<keyof RootState>).some((key) => next[key] !== state[key]);
  return changed ? next : state;
}
