import { useEffect, useRef } from "react";
import { useStore } from "../context/StoreContext";

interface NavState {
  depth: number;
}

function historyDepth(): number {
  return (window.history.state as NavState | null)?.depth ?? 0;
}

/**
 * Mirrors the screen stack (list -> chat -> info) into browser history,
 * so the system/browser back button closes the top screen on mobile.
 */
export function useHistoryNav(): void {
  const { state, dispatch } = useStore();
  const depth = state.ui.activeChatId ? (state.ui.infoOpen ? 2 : 1) : 0;
  const depthRef = useRef(depth);
  depthRef.current = depth;

  useEffect(() => {
    const current = historyDepth();
    if (depth > current) window.history.pushState({ depth } satisfies NavState, "");
    else if (depth < current) window.history.back();
  }, [depth]);

  useEffect(() => {
    const onPop = () => {
      const target = historyDepth();
      if (target < 2) dispatch({ type: "ui/setInfoOpen", open: false });
      if (target < 1) dispatch({ type: "ui/closeChat" });
      // App closed several screens at once: keep unwinding history.
      if (target > depthRef.current) window.history.back();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [dispatch]);
}
