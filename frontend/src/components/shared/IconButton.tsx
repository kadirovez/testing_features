import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  active?: boolean;
  variant?: "ghost" | "accent";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, children, active, variant = "ghost", className, ...rest }, ref) => (
    <Button
      ref={ref}
      variant={variant === "accent" ? "default" : "ghost"}
      size="icon"
      aria-label={label}
      title={label}
      className={cn("rounded-full", active && variant === "ghost" && "bg-accent text-foreground", className)}
      {...rest}
    >
      {children}
    </Button>
  ),
);
IconButton.displayName = "IconButton";
