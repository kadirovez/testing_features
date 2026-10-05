import { ArrowLeft } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { IconButton } from "../shared/IconButton";

interface ViewHeaderProps {
  title: string;
  onBack?: () => void;
}

export function ViewHeader({ title, onBack }: ViewHeaderProps) {
  const { dispatch } = useStore();
  const { t } = useLocale();

  const goBack = onBack ?? (() => dispatch({ type: "ui/setSidebarView", view: "chats" }));

  return (
    <header className="flex h-[var(--header-h)] shrink-0 items-center gap-2 border-b px-2">
      <IconButton label={t("common.back")} onClick={goBack}>
        <ArrowLeft strokeWidth={1.75} />
      </IconButton>
      <h2 className="truncate text-[15px] font-semibold">{title}</h2>
    </header>
  );
}
