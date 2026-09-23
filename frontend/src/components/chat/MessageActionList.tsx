import { useLocale } from "../../context/LocaleContext";
import type { MessageActionContext, MessageActionEntry } from "../../registries/messageActions";
import { DropdownItem } from "../shared/Dropdown";

interface MessageActionListProps {
  items: MessageActionEntry[];
  ctx: MessageActionContext;
  onDone: () => void;
}

export function MessageActionList({ items, ctx, onDone }: MessageActionListProps) {
  const { t } = useLocale();

  return (
    <>
      {items.map(({ id, icon: Icon, labelKey, danger, run }) => (
        <DropdownItem
          key={id}
          icon={<Icon size={18} strokeWidth={1.75} />}
          label={t(labelKey)}
          danger={danger}
          onSelect={() => {
            onDone();
            void run(ctx);
          }}
        />
      ))}
    </>
  );
}
