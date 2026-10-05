import { ArrowLeft, PanelRight } from "lucide-react";
import type { UUID } from "../../api/types";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { useChatMeta } from "../../hooks/useChatMeta";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar } from "../shared/Avatar";
import { IconButton } from "../shared/IconButton";

interface ChatHeaderProps {
  chatId: UUID;
}

export function ChatHeader({ chatId }: ChatHeaderProps) {
  const { state, dispatch } = useStore();
  const { t } = useLocale();
  const isMobile = useBreakpoint() === "mobile";
  const meta = useChatMeta(chatId);
  if (!meta) return null;

  const infoOpen = state.ui.infoOpen;
  const toggleInfo = () => dispatch({ type: "ui/setInfoOpen", open: !infoOpen });

  return (
    <header className="z-[1] flex h-[calc(var(--header-h)+env(safe-area-inset-top))] shrink-0 items-center gap-2 border-b bg-card/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur-sm md:px-4">
      {isMobile && (
        <IconButton label={t("common.back")} onClick={() => dispatch({ type: "ui/closeChat" })}>
          <ArrowLeft strokeWidth={1.75} />
        </IconButton>
      )}
      <button
        type="button"
        className="flex h-full min-w-0 flex-1 items-center gap-3 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        onClick={toggleInfo}
      >
        <Avatar
          name={meta.title}
          seed={meta.avatarSeed}
          mediaId={meta.avatarMediaId}
          size="md"
          online={meta.online}
          previewOnClick={false}
        />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] font-semibold leading-tight">{meta.title}</span>
          <span
            className={cn(
              "truncate text-[13px] leading-tight transition-colors duration-200",
              meta.online || meta.isTyping ? "text-primary" : "text-muted-foreground",
            )}
          >
            {meta.subtitle}
          </span>
        </span>
      </button>
      <Tooltip>
        <TooltipTrigger asChild>
          <IconButton label={t("info.title")} active={infoOpen} aria-pressed={infoOpen} onClick={toggleInfo}>
            <PanelRight strokeWidth={1.75} />
          </IconButton>
        </TooltipTrigger>
        <TooltipContent>{t("info.title")}</TooltipContent>
      </Tooltip>
    </header>
  );
}
