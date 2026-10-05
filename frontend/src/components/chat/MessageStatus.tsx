import { Check, CheckCheck } from "lucide-react";
import type { DeliveryStatus } from "../../api/types";
import { cn } from "@/lib/utils";

interface MessageStatusProps {
  status: DeliveryStatus;
  className?: string;
}

/** One check = sent, two checks = delivered, accent two checks = read. */
export function MessageStatus({ status, className }: MessageStatusProps) {
  const Icon = status === "sent" ? Check : CheckCheck;
  return (
    <Icon
      strokeWidth={2}
      className={cn("size-4 shrink-0", status === "read" ? "opacity-100" : "opacity-60", className)}
      aria-label={status}
    />
  );
}
