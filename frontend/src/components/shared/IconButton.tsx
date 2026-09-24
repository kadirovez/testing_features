import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../../utils/cx";
import styles from "./IconButton.module.css";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  active?: boolean;
  variant?: "ghost" | "accent";
}

export function IconButton({ label, children, active, variant = "ghost", className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(styles.button, styles[variant], active && styles.active, className)}
      {...rest}
    >
      {children}
    </button>
  );
}
