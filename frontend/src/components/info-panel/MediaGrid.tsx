import { Play } from "lucide-react";
import type { MediaBrief } from "../../api/types";
import { useLocale } from "../../context/LocaleContext";
import { useMediaUrl } from "../../hooks/useMediaUrl";
import type { InfoTabProps } from "../../registries/infoTabs";
import styles from "./InfoLists.module.css";

function Tile({ media }: { media: MediaBrief }) {
  const url = useMediaUrl(media.id, "thumbnail");
  return (
    <div className={styles.tile}>
      {url && <img src={url} alt="" loading="lazy" className={styles.tileImage} />}
      {media.kind === "video" && <Play size={18} strokeWidth={1.75} className={styles.tileBadge} fill="currentColor" />}
    </div>
  );
}

export function MediaGrid({ messages }: InfoTabProps) {
  const { t } = useLocale();
  const media = messages.flatMap((m) => m.attachments).reverse();

  if (media.length === 0) return <p className={styles.empty}>{t("info.noMedia")}</p>;

  return (
    <div className={styles.grid}>
      {media.map((item) => (
        <Tile key={item.id} media={item} />
      ))}
    </div>
  );
}
