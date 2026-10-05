import { MessagesSquare } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";

export function EmptyChat() {
  const { t } = useLocale();
  return (
    <div className="grid h-full place-items-center p-6">
      <span className="inline-flex items-center gap-2 rounded-full bg-black/35 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
        <MessagesSquare className="size-[18px]" strokeWidth={1.75} />
        {t("chat.selectPrompt")}
      </span>
    </div>
  );
}
