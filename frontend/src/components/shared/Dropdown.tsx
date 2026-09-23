import { useRef, type ReactNode } from "react";
import { useDismiss } from "../../hooks/useDismiss";
import { cx } from "../../utils/cx";
import styles from "./Dropdown.module.css";

interface DropdownProps {
  open: boolean;
  onClose: () => void;
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end" | "center";
  placement?: "bottom" | "top";
}

export function Dropdown({ open, onClose, trigger, children, align = "start", placement = "bottom" }: DropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, onClose);

  return (
    <div ref={ref} className={styles.root}>
      {trigger}
      <div
        className={cx(styles.panel, styles[align], placement === "top" && styles.top, open && styles.open)}
        role="menu"
        aria-hidden={!open}
      >
        {children}
      </div>
    </div>
  );
}

interface DropdownItemProps {
  icon: ReactNode;
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

export function DropdownItem({ icon, label, onSelect, danger }: DropdownItemProps) {
  return (
    <button type="button" role="menuitem" className={cx(styles.item, danger && styles.danger)} onClick={onSelect}>
      <span className={styles.icon}>{icon}</span>
      {label}
    </button>
  );
}
