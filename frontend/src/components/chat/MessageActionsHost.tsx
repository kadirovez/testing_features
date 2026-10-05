import { useRef } from "react";
import type { MessageRead, UUID } from "../../api/types";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { useChatActions } from "../../hooks/useChatActions";
import { visibleActions, type MessageActionContext } from "../../registries/messageActions";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { MessageActionList } from "./MessageActionList";
import { MessageContextMenu } from "./MessageContextMenu";

export interface MenuTarget {
  message: MessageRead;
  x: number;
  y: number;
}

interface MessageActionsHostProps {
  chatId: UUID;
  target: MenuTarget | null;
  onClose: () => void;
}

/** Desktop: context menu at cursor. Mobile: bottom drawer. Same action registry for both. */
export function MessageActionsHost({ chatId, target, onClose }: MessageActionsHostProps) {
  const { state } = useStore();
  const { t } = useLocale();
  const breakpoint = useBreakpoint();
  const actions = useChatActions();
  const chat = state.chats.byId[chatId];
  // Keep rendering the previous items while the menu fades out.
  const lastTarget = useRef(target);
  if (target) lastTarget.current = target;
  const shown = lastTarget.current;

  const ctx: MessageActionContext | null =
    shown && chat
      ? { message: shown.message, chat, isOwn: shown.message.sender_id === state.users.me?.id, actions }
      : null;
  const items = ctx ? visibleActions(ctx) : [];

  if (breakpoint === "mobile") {
    return (
      <Drawer open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent aria-describedby={undefined}>
          <DrawerTitle className="sr-only">{t("message.actions")}</DrawerTitle>
          <div className="flex flex-col p-2 pb-4">
            {ctx && <MessageActionList items={items} ctx={ctx} onDone={onClose} variant="sheet" />}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <MessageContextMenu open={Boolean(target)} x={shown?.x ?? 0} y={shown?.y ?? 0} onClose={onClose}>
      {ctx && <MessageActionList items={items} ctx={ctx} onDone={onClose} />}
    </MessageContextMenu>
  );
}
