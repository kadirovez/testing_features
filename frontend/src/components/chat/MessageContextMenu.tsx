import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDismiss } from "../../hooks/useDismiss";
import { cx } from "../../utils/cx";
import styles from "./MessageContextMenu.module.css";

const VIEWPORT_MARGIN = 8;

interface MessageContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  onClose: () => void;
  children: ReactNode;
}

export function MessageContextMenu({ open, x, y, onClose, children }: MessageContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y, originX: "left", originY: "top" });
  useDismiss(ref, open, onClose);

  // Flip the menu when it would overflow the viewport edge.
  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const { width, height } = ref.current.getBoundingClientRect();
    const flipX = x + width + VIEWPORT_MARGIN > window.innerWidth;
    const flipY = y + height + VIEWPORT_MARGIN > window.innerHeight;
    setPos({
      left: Math.max(VIEWPORT_MARGIN, flipX ? x - width : x),
      top: Math.max(VIEWPORT_MARGIN, flipY ? y - height : y),
      originX: flipX ? "right" : "left",
      originY: flipY ? "bottom" : "top",
    });
  }, [open, x, y]);

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-hidden={!open}
      className={cx(styles.menu, open && styles.open)}
      style={{ left: pos.left, top: pos.top, transformOrigin: `${pos.originY} ${pos.originX}` }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>,
    document.body,
  );
}
