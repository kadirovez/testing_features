import { ArrowLeft } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { IconButton } from "../shared/IconButton";
import styles from "./ViewHeader.module.css";

interface ViewHeaderProps {
  title: string;
  onBack?: () => void;
}

export function ViewHeader({ title, onBack }: ViewHeaderProps) {
  const { dispatch } = useStore();
  const { t } = useLocale();

  const goBack = onBack ?? (() => dispatch({ type: "ui/setSidebarView", view: "chats" }));

  return (
    <header className={styles.header}>
      <IconButton label={t("common.back")} onClick={goBack}>
        <ArrowLeft size={20} strokeWidth={1.75} />
      </IconButton>
      <h2 className={styles.title}>{title}</h2>
    </header>
  );
}
