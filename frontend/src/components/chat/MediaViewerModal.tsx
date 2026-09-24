import { Download, X } from "lucide-react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MediaBrief } from "../../api/types";
import { useLocale } from "../../context/LocaleContext";
import { useDismiss } from "../../hooks/useDismiss";
import { useMediaUrl } from "../../hooks/useMediaUrl";
import { IconButton } from "../shared/IconButton";
import styles from "./MediaViewerModal.module.css";

interface MediaViewerModalProps {
  media: MediaBrief;
  onClose: () => void;
}

function extensionForMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "jpg";
}

async function downloadFromUrl(url: string, filename: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("download failed");
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export function MediaViewerModal({ media, onClose }: MediaViewerModalProps) {
  const { t } = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const url = useMediaUrl(media.id, "original", media.status);
  const [downloading, setDownloading] = useState(false);

  useDismiss(ref, true, onClose);

  const onDownload = () => {
    if (!url || downloading) return;
    setDownloading(true);
    void downloadFromUrl(url, `image-${media.id}.${extensionForMime(media.mime_type)}`)
      .catch(() => undefined)
      .finally(() => setDownloading(false));
  };

  return createPortal(
    <div className={styles.backdrop} role="dialog" aria-modal aria-label={t("message.viewImage")}>
      <div ref={ref} className={styles.dialog}>
        <IconButton label={t("common.close")} className={styles.close} onClick={onClose}>
          <X size={20} strokeWidth={1.75} />
        </IconButton>
        <IconButton
          label={t("message.downloadImage")}
          className={styles.download}
          disabled={!url || downloading}
          onClick={onDownload}
        >
          <Download size={20} strokeWidth={1.75} />
        </IconButton>
        {url ? (
          <img className={styles.image} src={url} alt="" draggable={false} />
        ) : (
          <p className={styles.loading}>{t("common.loading")}</p>
        )}
      </div>
    </div>,
    document.body,
  );
}
