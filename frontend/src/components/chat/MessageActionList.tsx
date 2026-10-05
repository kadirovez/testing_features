import { useLocale } from "../../context/LocaleContext";
import type { MessageActionContext, MessageActionEntry } from "../../registries/messageActions";
import { cn } from "@/lib/utils";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface MessageActionListProps {
  items: MessageActionEntry[];
  ctx: MessageActionContext;
  onDone: () => void;
  /** "menu" renders Radix menu items, "sheet" plain buttons for the mobile drawer. */
  variant?: "menu" | "sheet";
}

export function MessageActionList({ items, ctx, onDone, variant = "menu" }: MessageActionListProps) {
  const { t } = useLocale();

  return (
    <>
      {items.map(({ id, icon: Icon, labelKey, danger, run }) => {
        const select = () => {
          onDone();
          void run(ctx);
        };
        if (variant === "menu") {
          return (
            <DropdownMenuItem key={id} variant={danger ? "destructive" : "default"} onSelect={select}>
              <Icon strokeWidth={1.75} />
              {t(labelKey)}
            </DropdownMenuItem>
          );
        }
        return (
          <button
            key={id}
            type="button"
            className={cn(
              "flex h-12 w-full items-center gap-3 rounded-md px-3 text-left text-[15px] transition-colors active:bg-accent",
              danger ? "text-destructive" : "text-foreground",
            )}
            onClick={select}
          >
            <Icon className={cn("size-5", danger ? "text-destructive" : "text-muted-foreground")} strokeWidth={1.75} />
            {t(labelKey)}
          </button>
        );
      })}
    </>
  );
}
