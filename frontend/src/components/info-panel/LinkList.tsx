import { Link2 } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import type { InfoTabProps } from "../../registries/infoTabs";
import { extractLinks } from "../../utils/links";
import styles from "./InfoLists.module.css";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function LinkList({ messages }: InfoTabProps) {
  const { t } = useLocale();
  const links = [...new Set(messages.flatMap((m) => extractLinks(m.content)))].reverse();

  if (links.length === 0) return <p className={styles.empty}>{t("info.noLinks")}</p>;

  return (
    <ul className={styles.list}>
      {links.map((url) => (
        <li key={url}>
          <a className={styles.row} href={url} target="_blank" rel="noreferrer">
            <span className={styles.fileIcon}>
              <Link2 size={20} strokeWidth={1.75} />
            </span>
            <span className={styles.rowBody}>
              <span className={styles.rowTitle}>{hostOf(url)}</span>
              <span className={styles.rowLink}>{url}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
