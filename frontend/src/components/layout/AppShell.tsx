import { useEffect, type CSSProperties } from "react";
import { useStore } from "../../context/StoreContext";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { useChatActions } from "../../hooks/useChatActions";
import { useHistoryNav } from "../../hooks/useHistoryNav";
import { usePreferencesSync } from "../../hooks/usePreferencesSync";
import { useRealtimeSync } from "../../hooks/useRealtimeSync";
import { useSidebarWidth } from "../../hooks/useSidebarWidth";
import { ChatArea } from "../chat/ChatArea";
import { InfoPanel } from "../info-panel/InfoPanel";
import { Sidebar } from "../sidebar/Sidebar";
import { SidebarResizeHandle } from "./SidebarResizeHandle";
import styles from "./AppShell.module.css";

export function AppShell() {
  const { state, dispatch } = useStore();
  const breakpoint = useBreakpoint();
  const actions = useChatActions();
  const { activeChatId, infoOpen } = state.ui;
  const infoPanelDocked = infoOpen && Boolean(activeChatId) && breakpoint === "desktop";
  const { width: sidebarWidth, resizing, onResizePointerDown } = useSidebarWidth(infoPanelDocked);
  const resizableSidebar = breakpoint !== "mobile";

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
      style={resizableSidebar ? ({ "--sidebar-w": `${sidebarWidth}px` } as CSSProperties) : undefined}
      data-breakpoint={breakpoint}
      data-chat-open={Boolean(activeChatId)}
      data-info-open={infoOpen && Boolean(activeChatId)}
      data-resizing={resizing || undefined}
    >
      <aside className={styles.sidebar}>
        <Sidebar />
        {resizableSidebar && (
          <SidebarResizeHandle active={resizing} onPointerDown={onResizePointerDown} />
        )}
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
