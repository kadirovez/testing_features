import { Copy, Trash2, type LucideIcon } from "lucide-react";
import type { ChatRead, MessageRead } from "../api/types";
import type { ChatActions } from "../hooks/useChatActions";
import type { TranslationKey } from "../i18n";

export interface MessageActionContext {
  message: MessageRead;
  chat: ChatRead;
  isOwn: boolean;
  actions: ChatActions;
}

export interface MessageActionEntry {
  id: string;
  icon: LucideIcon;
  labelKey: TranslationKey;
  danger?: boolean;
  isVisible: (ctx: MessageActionContext) => boolean;
  run: (ctx: MessageActionContext) => Promise<void> | void;
}

/** Add Reply / Edit / Forward here; menu and bottom sheet pick them up automatically. */
export const MESSAGE_ACTIONS: MessageActionEntry[] = [
  {
    id: "copy",
    icon: Copy,
    labelKey: "message.copy",
    isVisible: ({ message }) => Boolean(message.content),
    run: ({ message }) => navigator.clipboard.writeText(message.content ?? ""),
  },
  {
    id: "delete",
    icon: Trash2,
    labelKey: "message.delete",
    danger: true,
    isVisible: ({ isOwn, chat }) => isOwn || chat.my_role !== "member",
    run: ({ message, actions }) => actions.deleteMessage(message),
  },
];

export function visibleActions(ctx: MessageActionContext): MessageActionEntry[] {
  return MESSAGE_ACTIONS.filter((action) => action.isVisible(ctx));
}
