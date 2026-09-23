import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "../../context/LocaleContext";
import { useDismiss } from "../../hooks/useDismiss";
import { cx } from "../../utils/cx";
import { IconButton } from "./IconButton";
import styles from "./Modal.module.css";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  const { t } = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, onClose);

  return createPortal(
    <div className={cx(styles.backdrop, open && styles.open)} aria-hidden={!open}>
      <div ref={ref} role="dialog" aria-modal aria-label={title} className={styles.dialog}>
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <IconButton label={t("common.close")} onClick={onClose}>
            <X size={20} strokeWidth={1.75} />
          </IconButton>
        </header>
        {children}
      </div>
    </div>,
    document.body,
  );
}
