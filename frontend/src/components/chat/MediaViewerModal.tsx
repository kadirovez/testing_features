import { Download, X } from "lucide-react";
import { useState } from "react";
import type { MediaBrief } from "../../api/types";
import { useLocale } from "../../context/LocaleContext";
import { useMediaUrl } from "../../hooks/useMediaUrl";
import { IconButton } from "../shared/IconButton";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

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
  const url = useMediaUrl(media.id, "original", media.status);
  const [downloading, setDownloading] = useState(false);

  const onDownload = () => {
    if (!url || downloading) return;
    setDownloading(true);
    void downloadFromUrl(url, `image-${media.id}.${extensionForMime(media.mime_type)}`)
      .catch(() => undefined)
      .finally(() => setDownloading(false));
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showClose={false}
        aria-describedby={undefined}
        className="grid w-auto max-w-[min(96vw,960px)] place-items-center overflow-visible border-0 bg-transparent p-0 shadow-none"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <DialogTitle className="sr-only">{t("message.viewImage")}</DialogTitle>
        <IconButton
          label={t("common.close")}
          className="absolute top-2 left-2 z-[1] bg-black/50 text-white hover:bg-black/65 hover:text-white"
          onClick={onClose}
        >
          <X strokeWidth={1.75} />
        </IconButton>
        <IconButton
          label={t("message.downloadImage")}
          className="absolute top-2 right-2 z-[1] bg-black/50 text-white hover:bg-black/65 hover:text-white"
          disabled={!url || downloading}
          onClick={onDownload}
        >
          <Download strokeWidth={1.75} />
        </IconButton>
        {url ? (
          <img className="block max-h-[92dvh] max-w-full rounded-md object-contain" src={url} alt="" draggable={false} />
        ) : (
          <p className="m-8 text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.45)]">{t("common.loading")}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
