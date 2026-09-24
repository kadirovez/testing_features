import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import type { UUID } from "../../api/types";
import { useLocale } from "../../context/LocaleContext";
import { useChatActions } from "../../hooks/useChatActions";
import { MessageContextMenu } from "../chat/MessageContextMenu";
import { DropdownItem } from "../shared/Dropdown";
import { Modal } from "../shared/Modal";
import confirmStyles from "../sidebar-views/ContactProfileView.module.css";

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
        <DropdownItem
          icon={<Trash2 size={18} strokeWidth={1.75} />}
          label={t("chats.deleteChat")}
          danger
          onSelect={() => {
            if (chatId) setTargetChatId(chatId);
            setConfirmOpen(true);
            onClose();
          }}
        />
      </MessageContextMenu>
      <Modal
        open={confirmOpen && Boolean(targetChatId)}
        title={t("chats.deleteConfirmTitle")}
        onClose={() => !busy && setConfirmOpen(false)}
      >
        <div className={confirmStyles.confirmBody}>
          <p className={confirmStyles.confirmText}>{t("chats.deleteConfirmBody")}</p>
          {error && <p className={confirmStyles.error}>{error}</p>}
          <div className={confirmStyles.confirmActions}>
            <button type="button" className={confirmStyles.confirmCancel} disabled={busy} onClick={() => setConfirmOpen(false)}>
              {t("common.cancel")}
            </button>
            <button type="button" className={confirmStyles.confirmOk} disabled={busy} onClick={() => void onConfirm()}>
              {t("chats.deleteChat")}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
