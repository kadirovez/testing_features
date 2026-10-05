import { useRef } from "react";
import { useChatAppearance } from "../../context/ChatAppearanceContext";
import { useStore } from "../../context/StoreContext";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { ChatHeader } from "./ChatHeader";
import { EmptyChat } from "./EmptyChat";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";

export function ChatArea() {
  const { state } = useStore();
  const { chatWallpaperPatternStyle } = useChatAppearance();
  const breakpoint = useBreakpoint();
  const activeId = state.ui.activeChatId;
  // On mobile the chat screen slides out after closing; keep its content during the transition.
  const lastId = useRef(activeId);
  if (activeId) lastId.current = activeId;
  const chatId = activeId ?? (breakpoint === "mobile" ? lastId.current : null);

  return (
    <div className="relative flex h-full flex-col bg-chat">
      {chatWallpaperPatternStyle ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 transition-[opacity,filter] duration-200"
          style={chatWallpaperPatternStyle}
        />
      ) : null}
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
        {chatId ? (
          <>
            <ChatHeader chatId={chatId} />
            <MessageList key={chatId} chatId={chatId} />
            <MessageInput chatId={chatId} />
          </>
        ) : (
          <EmptyChat />
        )}
      </div>
    </div>
  );
}
