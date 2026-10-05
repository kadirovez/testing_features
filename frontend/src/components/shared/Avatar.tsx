import { useState } from "react";
import type { UUID } from "../../api/types";
import { useMediaUrl } from "../../hooks/useMediaUrl";
import { cn } from "@/lib/utils";
import { Avatar as AvatarRoot, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarColor, initials } from "../../utils/avatarColor";
import { AvatarPreviewModal } from "./AvatarPreviewModal";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-28 text-4xl font-medium",
};

const DOT_CLASS: Record<AvatarSize, string> = {
  sm: "size-2.5",
  md: "size-3",
  lg: "size-3.5",
  xl: "size-5 right-1.5 bottom-1.5",
};

interface AvatarProps {
  name: string;
  seed: string;
  mediaId?: UUID | null;
  src?: string | null;
  size?: AvatarSize;
  online?: boolean;
  className?: string;
  previewOnClick?: boolean;
}

export function Avatar({
  name,
  seed,
  mediaId,
  src,
  size = "md",
  online = false,
  className,
  previewOnClick = true,
}: AvatarProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const thumb = useMediaUrl(src ? null : mediaId, "thumbnail");
  const original = useMediaUrl(src ? null : mediaId, "original");
  const displayUrl = src ?? (size === "xl" ? original : thumb);
  const previewUrl = src ?? original ?? thumb;
  const canPreview = previewOnClick && Boolean(previewUrl);

  const body = (
    <span className={cn("relative inline-flex shrink-0 select-none", className)}>
      <AvatarRoot className={SIZE_CLASS[size]}>
        {displayUrl && <AvatarImage src={displayUrl} alt="" draggable={false} />}
        <AvatarFallback className="text-white tracking-wide" style={{ backgroundColor: avatarColor(seed) }}>
          {initials(name)}
        </AvatarFallback>
      </AvatarRoot>
      {online && (
        <span
          className={cn("absolute right-0 bottom-0 rounded-full bg-online ring-2 ring-card", DOT_CLASS[size])}
          aria-hidden
        />
      )}
    </span>
  );

  return (
    <>
      {canPreview ? (
        <button
          type="button"
          className="shrink-0 cursor-zoom-in rounded-full leading-none"
          aria-label={name}
          onClick={() => setPreviewOpen(true)}
        >
          {body}
        </button>
      ) : (
        body
      )}
      {previewOpen && previewUrl && <AvatarPreviewModal imageUrl={previewUrl} onClose={() => setPreviewOpen(false)} />}
    </>
  );
}
