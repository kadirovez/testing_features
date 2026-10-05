import type { MouseEvent } from "react";
import type { MessageRead } from "../../api/types";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { useLongPress } from "../../hooks/useLongPress";
import { avatarColor } from "../../utils/avatarColor";
import { cn } from "@/lib/utils";
import { formatClock } from "../../utils/formatTime";
import { splitByLinks } from "../../utils/links";
import { MessageMedia } from "./MessageMedia";
import { MessageStatus } from "./MessageStatus";

interface MessageBubbleProps {
  message: MessageRead;
  isOwn: boolean;
  isFirst: boolean;
  isLast: boolean;
  senderName?: string;
  senderSeed?: string;
  onMenu: (message: MessageRead, x: number, y: number) => void;
}

export function MessageBubble({ message, isOwn, isLast, senderName, senderSeed, onMenu }: MessageBubbleProps) {
  const { state } = useStore();
  const { t, locale } = useLocale();
  const longPress = useLongPress(() => onMenu(message, 0, 0), true);

  // Browser context menu is suppressed only on the bubble itself.
  const onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    onMenu(message, event.clientX, event.clientY);
  };

  const hasMedia = message.attachments.length > 0;
  const hasText = Boolean(message.content);
  const status = state.messages.status[message.id] ?? "sent";

  return (
    <div
      className={cn(
        "relative max-w-full rounded-lg text-sm leading-relaxed [overflow-wrap:anywhere] [-webkit-touch-callout:none] transition-[filter] duration-150 active:brightness-[0.97]",
        hasMedia ? "overflow-hidden p-0.5" : "px-3 py-2",
        isOwn
          ? cn("bg-bubble-out text-bubble-out-foreground", isLast && "rounded-br-xs")
          : cn("bg-bubble-in text-bubble-in-foreground", isLast && "rounded-bl-xs"),
      )}
      onContextMenu={onContextMenu}
      {...longPress}
    >
      {senderName && (
        <span
          className={cn("mb-0.5 block text-[13px] font-semibold", hasMedia && "px-2.5 pt-1")}
          style={{ color: avatarColor(senderSeed ?? senderName) }}
        >
          {senderName}
        </span>
      )}
      {hasMedia && <MessageMedia attachments={message.attachments} />}
      {hasText && (
        <p className={cn("m-0 whitespace-pre-wrap", hasMedia && "mt-1 px-2.5 pb-1.5")}>
          {splitByLinks(message.content ?? "").map((part, i) =>
            part.isLink ? (
              <a
                key={i}
                href={part.text}
                target="_blank"
                rel="noreferrer"
                className={cn("underline decoration-1 underline-offset-2", isOwn ? "text-inherit" : "text-primary")}
              >
                {part.text}
              </a>
            ) : (
              part.text
            ),
          )}
          {/* Reserves room so the floating time never overlaps the last line. */}
          <span className={cn("inline-block", isOwn ? "w-[84px]" : "w-[64px]")} aria-hidden />
        </p>
      )}
      <span
        className={cn(
          "absolute inline-flex items-center gap-0.5 text-[11px] tabular-nums select-none",
          hasMedia && !hasText
            ? "right-2 bottom-2 rounded-full bg-black/45 px-2 py-0.5 text-white"
            : cn("right-2 bottom-1", isOwn ? "text-bubble-out-foreground/60" : "text-subtle"),
        )}
      >
        {message.edited_at && <span>{t("chat.edited")}</span>}
        <time dateTime={message.created_at}>{formatClock(message.created_at, locale)}</time>
        {isOwn && (
          <MessageStatus status={status} className={hasMedia && !hasText ? "text-white" : "text-bubble-out-foreground/70"} />
        )}
      </span>
    </div>
  );
}
