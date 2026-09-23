import { Play } from "lucide-react";
import type { MediaBrief } from "../../api/types";
import { useMediaUrl } from "../../hooks/useMediaUrl";
import styles from "./MessageMedia.module.css";

interface MessageMediaProps {
  attachments: MediaBrief[];
}

function Attachment({ media }: { media: MediaBrief }) {
  const url = useMediaUrl(media.id, media.has_thumbnail ? "thumbnail" : "original");
  const ratio = media.width && media.height ? `${media.width} / ${media.height}` : "4 / 3";

  return (
    <div className={styles.item} style={{ aspectRatio: ratio }}>
      {url && <img className={styles.image} src={url} alt="" loading="lazy" draggable={false} />}
      {media.kind === "video" && (
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
