import { useRef, useState } from "react";
import { useStore } from "../../context/StoreContext";
import { SIDEBAR_VIEWS } from "../../registries/sidebarViews";
import { cx } from "../../utils/cx";
import { ChatList } from "./ChatList";
import styles from "./Sidebar.module.css";
import { SidebarHeader } from "./SidebarHeader";

export function Sidebar() {
  const { state } = useStore();
  const [query, setQuery] = useState("");
  const active = state.ui.sidebarView;
  // Keep the last view mounted so it can animate out instead of vanishing.
  const lastView = useRef(active);
  if (active !== "chats") lastView.current = active;

  return (
    <div className={styles.root}>
      <section className={cx(styles.layer, styles.base, active !== "chats" && styles.covered)} aria-hidden={active !== "chats"}>
        <SidebarHeader query={query} onQueryChange={setQuery} />
        <ChatList query={query} />
      </section>
      {SIDEBAR_VIEWS.map(({ id, component: View }) => (
        <section key={id} className={cx(styles.layer, styles.view, active === id && styles.active)} aria-hidden={active !== id}>
          {lastView.current === id && <View />}
        </section>
      ))}
    </div>
  );
}
