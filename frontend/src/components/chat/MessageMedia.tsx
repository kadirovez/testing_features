import { Loader2, Play } from "lucide-react";
import type { MediaBrief } from "../../api/types";
import { useMediaUrl } from "../../hooks/useMediaUrl";
import styles from "./MessageMedia.module.css";

interface MessageMediaProps {
  attachments: MediaBrief[];
}

function Attachment({ media }: { media: MediaBrief }) {
  const variant = media.has_thumbnail ? "thumbnail" : "original";
  const url = useMediaUrl(media.id, variant, media.status);
  const ratio = media.width && media.height ? `${media.width} / ${media.height}` : "4 / 3";
  const loading = media.status !== "failed" && !url;

  return (
    <div className={styles.item} style={{ aspectRatio: ratio }}>
      {loading && (
        <span className={styles.loader} aria-hidden>
          <Loader2 size={28} strokeWidth={1.75} className={styles.spin} />
        </span>
      )}
      {url && <img className={styles.image} src={url} alt="" loading="lazy" draggable={false} />}
      {media.kind === "video" && url && (
        <span className={styles.play}>
          <Play size={20} strokeWidth={1.75} fill="currentColor" />
        </span>
      )}
    </div>
  );
}

export function MessageMedia({ attachments }: MessageMediaProps) {
  return (
    <div className={styles.grid} data-count={Math.min(attachments.length, 4)}>
      {attachments.slice(0, 4).map((media) => (
        <Attachment key={media.id} media={media} />
      ))}
    </div>
  );
}
