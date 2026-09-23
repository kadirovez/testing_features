import { useRef } from "react";
import { useStore } from "../../context/StoreContext";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { ChatHeader } from "./ChatHeader";
import styles from "./ChatArea.module.css";
import { EmptyChat } from "./EmptyChat";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";

export function ChatArea() {
  const { state } = useStore();
  const breakpoint = useBreakpoint();
  const activeId = state.ui.activeChatId;
  // On mobile the chat screen slides out after closing; keep its content during the transition.
  const lastId = useRef(activeId);
  if (activeId) lastId.current = activeId;
  const chatId = activeId ?? (breakpoint === "mobile" ? lastId.current : null);

  return (
    <div className={styles.area}>
      <div className={styles.wallpaper} aria-hidden />
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
  );
}
