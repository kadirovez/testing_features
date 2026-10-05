import { useRef, useState } from "react";
import { useStore } from "../../context/StoreContext";
import { SIDEBAR_VIEWS } from "../../registries/sidebarViews";
import { cn } from "@/lib/utils";
import { ChatList } from "./ChatList";
import { SidebarHeader } from "./SidebarHeader";

const LAYER =
  "absolute inset-0 flex min-w-0 flex-col bg-card transition-[transform,opacity,visibility] duration-200 ease-standard";

export function Sidebar() {
  const { state } = useStore();
  const [query, setQuery] = useState("");
  const active = state.ui.sidebarView;
  // Keep the last view mounted so it can animate out instead of vanishing.
  const lastView = useRef(active);
  if (active !== "chats") lastView.current = active;

  return (
    <div className="relative size-full min-w-0 overflow-hidden bg-card">
      <section
        className={cn(LAYER, active !== "chats" && "invisible -translate-x-[12%] opacity-0")}
        aria-hidden={active !== "chats"}
      >
        <SidebarHeader query={query} onQueryChange={setQuery} />
        <ChatList query={query} />
      </section>
      {SIDEBAR_VIEWS.map(({ id, component: View }) => (
        <section
          key={id}
          className={cn(LAYER, active === id ? "visible translate-x-0 opacity-100" : "invisible translate-x-6 opacity-0")}
          aria-hidden={active !== id}
        >
          {lastView.current === id && <View />}
        </section>
      ))}
    </div>
  );
}
