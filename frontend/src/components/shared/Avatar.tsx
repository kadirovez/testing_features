import type { UUID } from "../../api/types";
import { useMediaUrl } from "../../hooks/useMediaUrl";
import { avatarColor, initials } from "../../utils/avatarColor";
import { cx } from "../../utils/cx";
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
}

export function Avatar({ name, seed, mediaId, src, size = "md", online = false, className }: AvatarProps) {
  const remote = useMediaUrl(src ? null : mediaId, size === "xl" ? "original" : "thumbnail");
  const url = src ?? remote;

  return (
    <span className={cx(styles.avatar, styles[size], className)} style={{ backgroundColor: avatarColor(seed) }}>
      {url ? <img className={styles.image} src={url} alt="" draggable={false} /> : initials(name)}
      {online && <span className={styles.online} aria-hidden />}
    </span>
  );
}
