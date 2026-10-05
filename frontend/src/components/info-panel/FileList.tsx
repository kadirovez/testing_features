import { FileImage, FileVideo } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import type { InfoTabProps } from "../../registries/infoTabs";
import { formatListTime } from "../../utils/formatTime";

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

  if (files.length === 0) return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t("info.noFiles")}</p>;

  return (
    <ul className="flex flex-col px-2">
      {files.map(({ media, at }) => {
        const Icon = media.kind === "video" ? FileVideo : FileImage;
        return (
          <li key={media.id} className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors duration-150 hover:bg-accent">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
              <Icon className="size-5" strokeWidth={1.75} />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{media.mime_type}</span>
              <span className="truncate text-xs text-muted-foreground">
                {formatSize(media.size_bytes)} · {formatListTime(at, locale)}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
