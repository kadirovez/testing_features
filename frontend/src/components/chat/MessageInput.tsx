import { FileUp, ImageIcon, Plus, SendHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { ApiError } from "../../api/client";
import type { UUID } from "../../api/types";
import { useLocale } from "../../context/LocaleContext";
import { useChatActions } from "../../hooks/useChatActions";
import { useTypingNotifier } from "../../hooks/useTypingNotifier";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";

const MAX_HEIGHT_PX = 180;
/** scrollHeight of a single empty line (matches the textarea leading-5 class). */
const SINGLE_LINE_HEIGHT_PX = 20;

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
  const [multiline, setMultiline] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const notifyTyping = useTypingNotifier(chatId);

  const closeAttach = useCallback(() => setAttachOpen(false), []);

  useEffect(() => {
    setText("");
    setError(null);
    setAttachOpen(false);
    setMultiline(false);
  }, [chatId]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(el.scrollHeight, MAX_HEIGHT_PX);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT_PX ? "auto" : "hidden";
    setMultiline(nextHeight > SINGLE_LINE_HEIGHT_PX + 1);
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
    <div className="w-full shrink-0 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:px-3 md:pb-3">
      {error && (
        <p role="alert" className="mx-auto mb-1 max-w-[760px] px-3 text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="mx-auto flex items-end gap-2 md:max-w-[760px]">
        <div
          className={cn(
            "flex min-h-11 min-w-0 flex-1 gap-1 rounded-xl border bg-card pr-1 pl-3.5 shadow-elev-1 transition-colors duration-150 focus-within:border-ring/50",
            multiline ? "items-end pb-1.5 pt-2.5" : "items-center",
          )}
        >
          <Textarea
            ref={ref}
            rows={1}
            aria-label={t("chat.inputPlaceholder")}
            className="max-h-[180px] min-h-5 flex-1 resize-none overflow-y-hidden rounded-none border-0 bg-transparent p-0 text-[15px] leading-5 shadow-none focus-visible:ring-0"
            value={text}
            placeholder={t("chat.inputPlaceholder")}
            onChange={(e) => {
              setText(e.target.value);
              notifyTyping(e.target.value.length > 0);
            }}
            onKeyDown={onKeyDown}
          />
          <DropdownMenu open={attachOpen} onOpenChange={setAttachOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full hover:text-primary data-[state=open]:bg-accent data-[state=open]:text-primary"
                aria-label={t("chat.attachMenu")}
                disabled={sending}
              >
                <Plus className="size-5" strokeWidth={1.75} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="min-w-48">
              <DropdownMenuItem
                onSelect={() => {
                  closeAttach();
                  galleryRef.current?.click();
                }}
              >
                <ImageIcon strokeWidth={1.75} />
                {t("chat.attachGallery")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => {}}>
                <FileUp strokeWidth={1.75} />
                {t("chat.attachFile")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button
          size="icon"
          className={cn(
            "size-11 shrink-0 rounded-full shadow-elev-1 transition-[background-color,color,transform] duration-200 active:scale-95 disabled:opacity-100",
            !canSend && "bg-card text-subtle",
          )}
          aria-label={t("chat.send")}
          disabled={!canSend}
          onClick={() => void submit()}
        >
          <SendHorizontal className="size-5" strokeWidth={1.75} />
        </Button>
      </div>
      <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={onGallery} />
    </div>
  );
}
