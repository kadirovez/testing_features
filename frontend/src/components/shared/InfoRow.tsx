import type { LucideIcon } from "lucide-react";

interface InfoRowProps {
  icon: LucideIcon;
  value: string;
  label: string;
}

export function InfoRow({ icon: Icon, value, label }: InfoRowProps) {
  return (
    <div className="flex items-start gap-4 rounded-md px-2 py-2">
      <Icon className="mt-0.5 size-5 shrink-0 text-subtle" strokeWidth={1.75} />
      <div className="flex min-w-0 flex-col">
        <span className="text-sm break-words whitespace-pre-wrap">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
