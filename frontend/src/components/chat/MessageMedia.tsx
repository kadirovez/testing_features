import { Loader2, Play } from "lucide-react";
import { useState } from "react";
import type { MediaBrief } from "../../api/types";
import { useMediaUrl } from "../../hooks/useMediaUrl";
import { cn } from "@/lib/utils";
import { fitSingleMediaBox, mediaAspectRatio } from "../../utils/mediaLayout";
import { MediaViewerModal } from "./MediaViewerModal";

interface MessageMediaProps {
  attachments: MediaBrief[];
}

interface AttachmentProps {
  media: MediaBrief;
  count: number;
  spanFull: boolean;
  onOpen: (media: MediaBrief) => void;
}

function Attachment({ media, count, spanFull, onOpen }: AttachmentProps) {
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
      className={cn(
        "relative block min-h-0 min-w-0 cursor-zoom-in overflow-hidden bg-muted disabled:cursor-default",
        !isSingle && "max-h-[260px] w-full",
        spanFull && "col-span-2",
      )}
      style={
        isSingle && singleSize
          ? { width: singleSize.width, height: singleSize.height }
          : { aspectRatio: mediaAspectRatio(media.width, media.height) }
      }
      disabled={media.kind !== "photo" || !url}
      aria-label={media.kind === "photo" ? "photo" : media.kind}
      onClick={(event) => {
        event.stopPropagation();
        onActivate();
      }}
    >
      {loading && (
        <span className="absolute inset-0 grid place-items-center text-subtle" aria-hidden>
          <Loader2 className="size-7 animate-spin" strokeWidth={1.75} />
        </span>
      )}
      {url && (
        <img
          className="block size-full object-contain animate-in fade-in-0 duration-200"
          src={url}
          alt=""
          loading="lazy"
          draggable={false}
        />
      )}
      {media.kind === "video" && url && (
        <span className="pointer-events-none absolute inset-0 m-auto grid size-11 place-items-center rounded-full bg-black/45 text-white">
          <Play className="size-5" strokeWidth={1.75} fill="currentColor" />
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
      <div
        className={cn(
          "grid gap-0.5 overflow-hidden rounded-[10px]",
          count === 1 ? "w-fit max-w-[min(340px,70vw)]" : "w-[min(340px,70vw)] grid-cols-2",
        )}
      >
        {visible.map((media, index) => (
          <Attachment
            key={media.id}
            media={media}
            count={count}
            spanFull={count === 3 && index === 0}
            onOpen={setViewerMedia}
          />
        ))}
      </div>
      {viewerMedia && <MediaViewerModal media={viewerMedia} onClose={() => setViewerMedia(null)} />}
    </>
  );
}
