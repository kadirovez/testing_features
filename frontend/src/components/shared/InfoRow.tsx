import type { LucideIcon } from "lucide-react";
import styles from "./InfoRow.module.css";

interface InfoRowProps {
  icon: LucideIcon;
  value: string;
  label: string;
}

export function InfoRow({ icon: Icon, value, label }: InfoRowProps) {
  return (
    <div className={styles.row}>
      <Icon size={20} strokeWidth={1.75} className={styles.rowIcon} />
      <div className={styles.rowBody}>
        <span className={styles.rowValue}>{value}</span>
        <span className={styles.rowLabel}>{label}</span>
      </div>
    </div>
  );
}
