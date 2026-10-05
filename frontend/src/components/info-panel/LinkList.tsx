import { Link2 } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import type { InfoTabProps } from "../../registries/infoTabs";
import { extractLinks } from "../../utils/links";

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

  if (links.length === 0) return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t("info.noLinks")}</p>;

  return (
    <ul className="flex flex-col px-2">
      {links.map((url) => (
        <li key={url}>
          <a className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors duration-150 hover:bg-accent" href={url} target="_blank" rel="noreferrer">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
              <Link2 className="size-5" strokeWidth={1.75} />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{hostOf(url)}</span>
              <span className="truncate text-xs text-primary">{url}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
