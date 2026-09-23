import { useEffect } from "react";
import { useStore } from "../../context/StoreContext";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { useChatActions } from "../../hooks/useChatActions";
import { useHistoryNav } from "../../hooks/useHistoryNav";
import { usePreferencesSync } from "../../hooks/usePreferencesSync";
import { useRealtimeSync } from "../../hooks/useRealtimeSync";
import { ChatArea } from "../chat/ChatArea";
import { InfoPanel } from "../info-panel/InfoPanel";
import { Sidebar } from "../sidebar/Sidebar";
import styles from "./AppShell.module.css";

export function AppShell() {
  const { state, dispatch } = useStore();
  const breakpoint = useBreakpoint();
  const actions = useChatActions();
  const { activeChatId, infoOpen } = state.ui;

  useRealtimeSync(actions);
  useHistoryNav();
  usePreferencesSync();

  useEffect(() => {
    void actions.loadChats();
  }, [actions]);

  const closeInfo = () => dispatch({ type: "ui/setInfoOpen", open: false });

  return (
    <div
      className={styles.shell}
      data-breakpoint={breakpoint}
      data-chat-open={Boolean(activeChatId)}
      data-info-open={infoOpen && Boolean(activeChatId)}
    >
      <aside className={styles.sidebar}>
        <Sidebar />
      </aside>
      <main className={styles.chat}>
        <ChatArea />
      </main>
      <div className={styles.backdrop} onClick={closeInfo} aria-hidden />
      <aside className={styles.info}>
        <div className={styles.infoInner}>
          <InfoPanel />
        </div>
      </aside>
    </div>
  );
}
