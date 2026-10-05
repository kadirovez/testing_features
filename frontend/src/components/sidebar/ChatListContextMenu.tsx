import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import type { UUID } from "../../api/types";
import { useLocale } from "../../context/LocaleContext";
import { useChatActions } from "../../hooks/useChatActions";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MessageContextMenu } from "../chat/MessageContextMenu";
import { Modal } from "../shared/Modal";

interface ChatListContextMenuProps {
  chatId: UUID | null;
  x: number;
  y: number;
  onClose: () => void;
}

export function ChatListContextMenu({ chatId, x, y, onClose }: ChatListContextMenuProps) {
  const { t } = useLocale();
  const actions = useChatActions();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetChatId, setTargetChatId] = useState<UUID | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chatId) return;
    setTargetChatId(chatId);
  }, [chatId]);

  const closeAll = () => {
    setConfirmOpen(false);
    setTargetChatId(null);
    setError(null);
    onClose();
  };

  const onConfirm = async () => {
    if (!targetChatId) return;
    setBusy(true);
    setError(null);
    try {
      await actions.dismissChat(targetChatId);
      closeAll();
    } catch (err: unknown) {
      if (!(err instanceof ApiError)) throw err;
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <MessageContextMenu open={Boolean(chatId) && !confirmOpen} x={x} y={y} onClose={onClose}>
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            if (chatId) setTargetChatId(chatId);
            setConfirmOpen(true);
            onClose();
          }}
        >
          <Trash2 strokeWidth={1.75} />
          {t("chats.deleteChat")}
        </DropdownMenuItem>
      </MessageContextMenu>
      <Modal
        open={confirmOpen && Boolean(targetChatId)}
        title={t("chats.deleteConfirmTitle")}
        onClose={() => !busy && setConfirmOpen(false)}
        className="max-w-sm"
      >
        <p className="text-sm text-muted-foreground">{t("chats.deleteConfirmBody")}</p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" disabled={busy} onClick={() => setConfirmOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" disabled={busy} onClick={() => void onConfirm()}>
            {t("chats.deleteChat")}
          </Button>
        </div>
      </Modal>
    </>
  );
}
