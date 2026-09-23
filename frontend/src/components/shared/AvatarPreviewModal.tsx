import { X } from "lucide-react";
import { useRef } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "../../context/LocaleContext";
import { useDismiss } from "../../hooks/useDismiss";
import { IconButton } from "./IconButton";
import styles from "./AvatarPreviewModal.module.css";

interface AvatarPreviewModalProps {
  imageUrl: string;
  onClose: () => void;
}

export function AvatarPreviewModal({ imageUrl, onClose }: AvatarPreviewModalProps) {
  const { t } = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, true, onClose);

  return createPortal(
    <div className={styles.backdrop} role="dialog" aria-modal aria-label={t("avatar.previewLabel")}>
      <div ref={ref} className={styles.dialog}>
        <IconButton label={t("common.close")} className={styles.close} onClick={onClose}>
          <X size={20} strokeWidth={1.75} />
        </IconButton>
        <img className={styles.image} src={imageUrl} alt="" draggable={false} />
      </div>
    </div>,
    document.body,
  );
}
