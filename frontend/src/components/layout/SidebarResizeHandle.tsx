import type { PointerEventHandler } from "react";
import styles from "./SidebarResizeHandle.module.css";

interface SidebarResizeHandleProps {
  active: boolean;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
}

export function SidebarResizeHandle({ active, onPointerDown }: SidebarResizeHandleProps) {
  return (
    <div
      className={styles.handle}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      data-active={active || undefined}
      onPointerDown={onPointerDown}
    />
  );
}
