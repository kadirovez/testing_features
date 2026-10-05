import { useEffect, type CSSProperties } from "react";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { useChatActions } from "../../hooks/useChatActions";
import { useHistoryNav } from "../../hooks/useHistoryNav";
import { usePreferencesSync } from "../../hooks/usePreferencesSync";
import { useRealtimeSync } from "../../hooks/useRealtimeSync";
import { useSidebarWidth } from "../../hooks/useSidebarWidth";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChatArea } from "../chat/ChatArea";
import { InfoPanel } from "../info-panel/InfoPanel";
import { Sidebar } from "../sidebar/Sidebar";
import { SidebarResizeHandle } from "./SidebarResizeHandle";

export function AppShell() {
  const { state, dispatch } = useStore();
  const { t } = useLocale();
  const breakpoint = useBreakpoint();
  const actions = useChatActions();
  const { activeChatId, infoOpen } = state.ui;
  const isDesktop = breakpoint === "desktop";
  const isMobile = breakpoint === "mobile";
  const infoVisible = infoOpen && Boolean(activeChatId);
  const infoPanelDocked = infoVisible && isDesktop;
  const { width: sidebarWidth, resizing, onResizePointerDown } = useSidebarWidth(infoPanelDocked);
  const chatOpen = Boolean(activeChatId);

  useRealtimeSync(actions);
  useHistoryNav();
  usePreferencesSync();

  useEffect(() => {
    void actions.loadChats();
  }, [actions]);

  const closeInfo = () => dispatch({ type: "ui/setInfoOpen", open: false });

  return (
    <TooltipProvider delayDuration={400}>
      <div
        className="flex h-[var(--app-height,100dvh)] flex-col overflow-hidden bg-background"
        style={!isMobile ? ({ "--sidebar-w": `${sidebarWidth}px` } as CSSProperties) : undefined}
      >
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <aside
            className={cn(
              "relative z-[2] min-w-0 bg-card transition-transform duration-250 ease-standard",
              isMobile ? "absolute inset-0" : "shrink-0 basis-[var(--sidebar-w)] border-r",
              isMobile && chatOpen && "invisible -translate-x-full",
            )}
          >
            <Sidebar />
            {!isMobile && <SidebarResizeHandle active={resizing} onPointerDown={onResizePointerDown} />}
          </aside>
          <main
            className={cn(
              "min-w-0 flex-1 bg-chat transition-transform duration-250 ease-standard",
              isDesktop && "min-w-80",
              isMobile && "absolute inset-0 z-[5]",
              isMobile && !chatOpen && "translate-x-full",
            )}
          >
            <ChatArea />
          </main>
          {isDesktop && (
            <aside
              className={cn(
                "shrink-0 overflow-hidden border-l bg-card transition-[width,visibility] duration-250 ease-standard",
                infoPanelDocked ? "w-[var(--info-w)]" : "invisible w-0 border-l-0",
              )}
            >
              <div className="h-full w-[var(--info-w)]"><InfoPanel /></div>
            </aside>
          )}
        </div>
      </div>
      {!isDesktop && (
        <Sheet open={infoVisible} onOpenChange={(open) => !open && closeInfo()}>
          <SheetContent side="right" aria-describedby={undefined}>
            <SheetTitle className="sr-only">{t("info.title")}</SheetTitle>
            <InfoPanel />
          </SheetContent>
        </Sheet>
      )}
    </TooltipProvider>
  );
}
