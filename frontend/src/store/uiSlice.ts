import type { UUID } from "../api/types";

/** Ids come from the sidebar view registry; "chats" is the default list. */
export type SidebarViewId = "chats" | "profile" | "contacts" | "settings";

export interface UiState {
  activeChatId: UUID | null;
  infoOpen: boolean;
  sidebarView: SidebarViewId;
}

export type UiAction =
  | { type: "ui/openChat"; chatId: UUID }
  | { type: "ui/closeChat" }
  | { type: "ui/setInfoOpen"; open: boolean }
  | { type: "ui/setSidebarView"; view: SidebarViewId };

export const initialUiState: UiState = { activeChatId: null, infoOpen: false, sidebarView: "chats" };

export function uiReducer(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case "ui/openChat":
      return { ...state, activeChatId: action.chatId, sidebarView: "chats" };
    case "ui/closeChat":
      return { ...state, activeChatId: null, infoOpen: false };
    case "ui/setInfoOpen":
      return { ...state, infoOpen: action.open };
    case "ui/setSidebarView":
      return { ...state, sidebarView: action.view };
    default:
      return state;
  }
}
