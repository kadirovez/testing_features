import { Check, CheckCheck } from "lucide-react";
import type { DeliveryStatus } from "../../api/types";

interface MessageStatusProps {
  status: DeliveryStatus;
  className?: string;
}

/** One check = sent, two checks = delivered, accent two checks = read. */
export function MessageStatus({ status, className }: MessageStatusProps) {
  const Icon = status === "sent" ? Check : CheckCheck;
  return (
    <Icon
      size={16}
      strokeWidth={2}
      className={className}
      style={{ opacity: status === "read" ? 1 : 0.6, flexShrink: 0 }}
      aria-label={status}
    />
  );
}
