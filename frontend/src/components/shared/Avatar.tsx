import { useState } from "react";
import type { UUID } from "../../api/types";
import { useMediaUrl } from "../../hooks/useMediaUrl";
import { avatarColor, initials } from "../../utils/avatarColor";
import { cx } from "../../utils/cx";
import { AvatarPreviewModal } from "./AvatarPreviewModal";
import styles from "./Avatar.module.css";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

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
    <span className={cx(styles.avatar, styles[size], className)} style={{ backgroundColor: avatarColor(seed) }}>
      {displayUrl ? <img className={styles.image} src={displayUrl} alt="" draggable={false} /> : initials(name)}
      {online && <span className={styles.online} aria-hidden />}
    </span>
  );

  return (
    <>
      {canPreview ? (
        <button type="button" className={styles.hitTarget} onClick={() => setPreviewOpen(true)}>
          {body}
        </button>
      ) : (
        body
      )}
      {previewOpen && previewUrl && <AvatarPreviewModal imageUrl={previewUrl} onClose={() => setPreviewOpen(false)} />}
    </>
  );
}
