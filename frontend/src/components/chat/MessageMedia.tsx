import { Loader2, Play } from "lucide-react";
import { useState } from "react";
import type { MediaBrief } from "../../api/types";
import { useMediaUrl } from "../../hooks/useMediaUrl";
import { fitSingleMediaBox, mediaAspectRatio } from "../../utils/mediaLayout";
import { MediaViewerModal } from "./MediaViewerModal";
import styles from "./MessageMedia.module.css";

interface MessageMediaProps {
  attachments: MediaBrief[];
}

interface AttachmentProps {
  media: MediaBrief;
  count: number;
  onOpen: (media: MediaBrief) => void;
}

function Attachment({ media, count, onOpen }: AttachmentProps) {
  const variant = media.has_thumbnail ? "thumbnail" : "original";
  const url = useMediaUrl(media.id, variant, media.status);
  const loading = media.status !== "failed" && !url;
  const isSingle = count === 1;
  const singleSize = isSingle ? fitSingleMediaBox(media.width, media.height) : null;

  const onActivate = () => {
    if (media.kind === "photo" && url) onOpen(media);
  };

  return (
    <button
      type="button"
      className={styles.item}
      style={
        isSingle && singleSize
          ? { width: singleSize.width, height: singleSize.height }
          : { aspectRatio: mediaAspectRatio(media.width, media.height) }
      }
      disabled={media.kind !== "photo" || !url}
      aria-label={media.kind === "photo" ? undefined : media.kind}
      onClick={(event) => {
        event.stopPropagation();
        onActivate();
      }}
    >
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
    </button>
  );
}

export function MessageMedia({ attachments }: MessageMediaProps) {
  const [viewerMedia, setViewerMedia] = useState<MediaBrief | null>(null);
  const visible = attachments.slice(0, 4);
  const count = visible.length;

  return (
    <>
      <div className={styles.grid} data-count={count}>
        {visible.map((media) => (
          <Attachment key={media.id} media={media} count={count} onOpen={setViewerMedia} />
        ))}
      </div>
      {viewerMedia && <MediaViewerModal media={viewerMedia} onClose={() => setViewerMedia(null)} />}
    </>
  );
}
