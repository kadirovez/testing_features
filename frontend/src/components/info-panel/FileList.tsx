import { FileImage, FileVideo } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import type { InfoTabProps } from "../../registries/infoTabs";
import { formatListTime } from "../../utils/formatTime";
import styles from "./InfoLists.module.css";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function FileList({ messages }: InfoTabProps) {
  const { t, locale } = useLocale();
  const files = messages
    .flatMap((m) => m.attachments.map((media) => ({ media, at: m.created_at })))
    .reverse();

  if (files.length === 0) return <p className={styles.empty}>{t("info.noFiles")}</p>;

  return (
    <ul className={styles.list}>
      {files.map(({ media, at }) => {
        const Icon = media.kind === "video" ? FileVideo : FileImage;
        return (
          <li key={media.id} className={styles.row}>
            <span className={styles.fileIcon}>
              <Icon size={20} strokeWidth={1.75} />
            </span>
            <span className={styles.rowBody}>
              <span className={styles.rowTitle}>{media.mime_type}</span>
              <span className={styles.rowSub}>
                {formatSize(media.size_bytes)} · {formatListTime(at, locale)}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
