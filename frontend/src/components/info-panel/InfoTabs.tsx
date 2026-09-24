import { useState } from "react";
import type { MessageRead } from "../../api/types";
import { useLocale } from "../../context/LocaleContext";
import { INFO_TABS } from "../../registries/infoTabs";
import { cx } from "../../utils/cx";
import styles from "./InfoTabs.module.css";

interface InfoTabsProps {
  messages: MessageRead[];
}

export function InfoTabs({ messages }: InfoTabsProps) {
  const { t } = useLocale();
  const [activeId, setActiveId] = useState(INFO_TABS[0].id);
  const activeIndex = INFO_TABS.findIndex((tab) => tab.id === activeId);
  const Active = INFO_TABS[activeIndex].component;

  return (
    <section className={styles.root}>
      <div className={styles.tabs} role="tablist" style={{ gridTemplateColumns: `repeat(${INFO_TABS.length}, 1fr)` }}>
        {INFO_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeId}
            className={cx(styles.tab, tab.id === activeId && styles.active)}
            onClick={() => setActiveId(tab.id)}
          >
            {t(tab.labelKey)}
          </button>
        ))}
        <span
          className={styles.indicator}
          style={{ width: `${100 / INFO_TABS.length}%`, transform: `translateX(${activeIndex * 100}%)` }}
        />
      </div>
      <div key={activeId} className={styles.content} role="tabpanel">
        <Active messages={messages} />
      </div>
    </section>
  );
}
