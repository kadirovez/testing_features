import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDismiss } from "../../hooks/useDismiss";
import { cx } from "../../utils/cx";
import styles from "./BottomSheet.module.css";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, onClose);

  return createPortal(
    <div className={cx(styles.backdrop, open && styles.open)} aria-hidden={!open}>
      <div ref={ref} role="dialog" aria-modal className={styles.sheet}>
        <span className={styles.handle} aria-hidden />
        {children}
      </div>
    </div>,
    document.body,
  );
}
