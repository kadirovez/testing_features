import { FileUp, ImageIcon, Plus, SendHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { ApiError } from "../../api/client";
import type { UUID } from "../../api/types";
import { useLocale } from "../../context/LocaleContext";
import { useChatActions } from "../../hooks/useChatActions";
import { useTypingNotifier } from "../../hooks/useTypingNotifier";
import { cx } from "../../utils/cx";
import { Dropdown, DropdownItem } from "../shared/Dropdown";
import styles from "./MessageInput.module.css";

const MAX_HEIGHT_PX = 180;

interface MessageInputProps {
  chatId: UUID;
}

export function MessageInput({ chatId }: MessageInputProps) {
  const { t } = useLocale();
  const actions = useChatActions();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const notifyTyping = useTypingNotifier(chatId);

  const closeAttach = useCallback(() => setAttachOpen(false), []);

  useEffect(() => {
    setText("");
    setError(null);
    setAttachOpen(false);
  }, [chatId]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT_PX ? "auto" : "hidden";
  }, [text]);

  const canSend = text.trim().length > 0 && !sending;

  const submit = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      await actions.sendMessage(chatId, text.trim());
      setText("");
      notifyTyping(false);
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      setError(err.message);
    } finally {
      setSending(false);
      ref.current?.focus();
    }
  };

  const onGallery = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])].filter((file) => file.type.startsWith("image/"));
    event.target.value = "";
    closeAttach();
    if (files.length === 0) return;
    setSending(true);
    setError(null);
    void actions
      .sendImages(chatId, files)
      .catch((err: unknown) => {
        if (!(err instanceof ApiError)) throw err;
        setError(err.message);
      })
      .finally(() => {
        setSending(false);
        ref.current?.focus();
      });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <div className={styles.dock}>
      {error && <span className={styles.error}>{error}</span>}
      <div className={styles.row}>
        <div className={styles.field}>
          <textarea
            ref={ref}
            rows={1}
            className={styles.textarea}
            value={text}
            placeholder={t("chat.inputPlaceholder")}
            onChange={(e) => {
              setText(e.target.value);
              notifyTyping(e.target.value.length > 0);
            }}
            onKeyDown={onKeyDown}
          />
          <Dropdown
            open={attachOpen}
            onClose={closeAttach}
            align="end"
            placement="top"
            trigger={
              <button
                type="button"
                className={cx(styles.attach, attachOpen && styles.attachActive)}
                aria-label={t("chat.attachMenu")}
                aria-haspopup="menu"
                aria-expanded={attachOpen}
                disabled={sending}
                onClick={() => setAttachOpen((open) => !open)}
              >
                <Plus size={22} strokeWidth={1.75} />
              </button>
            }
          >
            <DropdownItem
              icon={<ImageIcon size={18} strokeWidth={1.75} />}
              label={t("chat.attachGallery")}
              onSelect={() => {
                closeAttach();
                galleryRef.current?.click();
              }}
            />
            <DropdownItem icon={<FileUp size={18} strokeWidth={1.75} />} label={t("chat.attachFile")} onSelect={() => {}} />
          </Dropdown>
        </div>
        <button
          type="button"
          className={cx(styles.send, canSend && styles.ready)}
          aria-label={t("chat.send")}
          disabled={!canSend}
          onClick={() => void submit()}
        >
          <SendHorizontal size={20} strokeWidth={1.75} />
        </button>
      </div>
      <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={onGallery} />
    </div>
  );
}
