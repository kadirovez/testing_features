import { Play } from "lucide-react";
import { useState } from "react";
import type { MediaBrief } from "../../api/types";
import { MediaViewerModal } from "../chat/MediaViewerModal";
import { useLocale } from "../../context/LocaleContext";
import { useMediaUrl } from "../../hooks/useMediaUrl";
import type { InfoTabProps } from "../../registries/infoTabs";

interface TileProps {
  media: MediaBrief;
  onOpenPhoto: (media: MediaBrief) => void;
  label: string;
}

function Tile({ media, onOpenPhoto, label }: TileProps) {
  const variant = media.has_thumbnail ? "thumbnail" : "original";
  const url = useMediaUrl(media.id, variant, media.status);
  const isPhoto = media.kind === "photo";

  if (!isPhoto) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-sm bg-muted" aria-hidden>
        {url && <img src={url} alt="" loading="lazy" className="size-full object-cover" />}
        {media.kind === "video" && <Play size={18} strokeWidth={1.75} className="absolute right-1.5 bottom-1.5 text-white drop-shadow" fill="currentColor" />}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="relative aspect-square cursor-zoom-in overflow-hidden rounded-sm bg-muted transition-opacity duration-150 hover:opacity-90 disabled:cursor-default"
      disabled={!url}
      aria-label={label}
      onClick={() => onOpenPhoto(media)}
    >
      {url && <img src={url} alt="" loading="lazy" className="size-full object-cover" draggable={false} />}
    </button>
  );
}

export function MediaGrid({ messages }: InfoTabProps) {
  const { t } = useLocale();
  const [viewerMedia, setViewerMedia] = useState<MediaBrief | null>(null);
  const media = messages.flatMap((m) => m.attachments).reverse();

  if (media.length === 0) return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t("info.noMedia")}</p>;

  return (
    <>
      <div className="grid grid-cols-3 gap-1 p-3">
        {media.map((item) => (
          <Tile key={item.id} media={item} onOpenPhoto={setViewerMedia} label={t("info.tabMedia")} />
        ))}
      </div>
      {viewerMedia && <MediaViewerModal media={viewerMedia} onClose={() => setViewerMedia(null)} />}
    </>
  );
}
