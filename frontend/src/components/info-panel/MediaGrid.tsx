import { Play } from "lucide-react";
import { useState } from "react";
import type { MediaBrief } from "../../api/types";
import { MediaViewerModal } from "../chat/MediaViewerModal";
import { useLocale } from "../../context/LocaleContext";
import { useMediaUrl } from "../../hooks/useMediaUrl";
import type { InfoTabProps } from "../../registries/infoTabs";
import styles from "./InfoLists.module.css";

interface TileProps {
  media: MediaBrief;
  onOpenPhoto: (media: MediaBrief) => void;
}

function Tile({ media, onOpenPhoto }: TileProps) {
  const variant = media.has_thumbnail ? "thumbnail" : "original";
  const url = useMediaUrl(media.id, variant, media.status);
  const isPhoto = media.kind === "photo";

  if (!isPhoto) {
    return (
      <div className={styles.tile} aria-hidden>
        {url && <img src={url} alt="" loading="lazy" className={styles.tileImage} />}
        {media.kind === "video" && <Play size={18} strokeWidth={1.75} className={styles.tileBadge} fill="currentColor" />}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={styles.tile}
      disabled={!url}
      onClick={() => onOpenPhoto(media)}
    >
      {url && <img src={url} alt="" loading="lazy" className={styles.tileImage} draggable={false} />}
    </button>
  );
}

export function MediaGrid({ messages }: InfoTabProps) {
  const { t } = useLocale();
  const [viewerMedia, setViewerMedia] = useState<MediaBrief | null>(null);
  const media = messages.flatMap((m) => m.attachments).reverse();

  if (media.length === 0) return <p className={styles.empty}>{t("info.noMedia")}</p>;

  return (
    <>
      <div className={styles.grid}>
        {media.map((item) => (
          <Tile key={item.id} media={item} onOpenPhoto={setViewerMedia} />
        ))}
      </div>
      {viewerMedia && <MediaViewerModal media={viewerMedia} onClose={() => setViewerMedia(null)} />}
    </>
  );
}
