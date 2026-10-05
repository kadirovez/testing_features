import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold leading-5 tabular-nums",
  {
    variants: {
      variant: {
        default: "bg-badge text-primary-foreground",
        muted: "bg-badge-muted text-white",
        secondary: "bg-secondary text-muted-foreground",
        outline: "border text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
