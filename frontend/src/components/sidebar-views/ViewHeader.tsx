import { ArrowLeft } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { IconButton } from "../shared/IconButton";
import styles from "./ViewHeader.module.css";

interface ViewHeaderProps {
  title: string;
}

export function ViewHeader({ title }: ViewHeaderProps) {
  const { dispatch } = useStore();
  const { t } = useLocale();

  return (
    <header className={styles.header}>
      <IconButton label={t("common.back")} onClick={() => dispatch({ type: "ui/setSidebarView", view: "chats" })}>
        <ArrowLeft size={20} strokeWidth={1.75} />
      </IconButton>
      <h2 className={styles.title}>{title}</h2>
    </header>
  );
}
