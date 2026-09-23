import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MessageRead, UUID } from "../../api/types";
import { useStore } from "../../context/StoreContext";
import { useChatActions } from "../../hooks/useChatActions";
import { groupMessages } from "../../utils/groupMessages";
import { DayDivider } from "./DayDivider";
import { MessageActionsHost, type MenuTarget } from "./MessageActionsHost";
import { MessageGroup } from "./MessageGroup";
import styles from "./MessageList.module.css";

const TOP_LOAD_THRESHOLD_PX = 240;
const STICK_TO_BOTTOM_PX = 120;

interface MessageListProps {
  chatId: UUID;
}

export function MessageList({ chatId }: MessageListProps) {
  const { state } = useStore();
  const actions = useChatActions();
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevHeight = useRef(0);
  const nearBottom = useRef(true);
  const loadingOlder = useRef(false);
  const [menu, setMenu] = useState<MenuTarget | null>(null);

  const timeline = state.messages.byChat[chatId];
  const messages = useMemo(
    () => (timeline?.ids ?? []).map((id) => state.messages.byId[id]),
    [timeline?.ids, state.messages.byId],
  );
  const sections = useMemo(() => groupMessages(messages), [messages]);
  const isGroup = state.chats.byId[chatId]?.type === "group";

  // Keep the viewport anchored: stick to bottom for new messages, preserve offset when prepending history.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (loadingOlder.current) {
      el.scrollTop += el.scrollHeight - prevHeight.current;
      loadingOlder.current = false;
    } else if (nearBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
    prevHeight.current = el.scrollHeight;
  }, [messages.length]);

  // Viewport resizes (mobile keyboard, window resize) should not detach the view from the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (nearBottom.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_TO_BOTTOM_PX;
    if (el.scrollTop < TOP_LOAD_THRESHOLD_PX && timeline?.nextCursor && !loadingOlder.current) {
      loadingOlder.current = true;
      prevHeight.current = el.scrollHeight;
      void actions.loadHistory(chatId, true);
    }
  };

  const openMenu = useCallback((message: MessageRead, x: number, y: number) => setMenu({ message, x, y }), []);
  const closeMenu = useCallback(() => setMenu(null), []);

  return (
    <div ref={scrollRef} className={styles.scroll} onScroll={onScroll}>
      <div className={styles.column}>
        {sections.map((section) => (
          <section key={section.key} className={styles.day}>
            <DayDivider date={section.date} />
            {section.groups.map((group) => (
              <MessageGroup key={group.key} group={group} showSender={isGroup} onMenu={openMenu} />
            ))}
          </section>
        ))}
      </div>
      <MessageActionsHost chatId={chatId} target={menu} onClose={closeMenu} />
    </div>
  );
}
