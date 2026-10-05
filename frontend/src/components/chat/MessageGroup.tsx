import type { MessageRead } from "../../api/types";
import { useStore } from "../../context/StoreContext";
import type { MessageGroup as Group } from "../../utils/groupMessages";
import { cn } from "@/lib/utils";
import { Avatar } from "../shared/Avatar";
import { MessageBubble } from "./MessageBubble";

interface MessageGroupProps {
  group: Group;
  showSender: boolean;
  onMenu: (message: MessageRead, x: number, y: number) => void;
}

export function MessageGroup({ group, showSender, onMenu }: MessageGroupProps) {
  const { state } = useStore();
  const isOwn = group.senderId === state.users.me?.id;
  const sender = group.senderId ? state.users.byId[group.senderId] : undefined;

  if (group.isSystem) {
    return (
      <div className="my-2 flex flex-col items-center gap-1">
        {group.messages.map((m) => (
          <span key={m.id} className="rounded-full bg-black/30 px-3 py-0.5 text-xs text-white backdrop-blur-sm">
            {m.system_text}
          </span>
        ))}
      </div>
    );
  }

  const withAvatar = showSender && !isOwn;

  return (
    <div
      className={cn(
        "mt-2 flex items-end gap-2 animate-in fade-in-0 slide-in-from-bottom-1 duration-200",
        isOwn ? "justify-end" : "justify-start",
      )}
    >
      {withAvatar && (
        <div className="flex self-stretch items-end">
          {/* Avatar follows the last bubble while scrolling through a long group. */}
          <Avatar
            name={sender?.username ?? "?"}
            seed={group.senderId ?? group.key}
            mediaId={sender?.avatar_media_id}
            size="sm"
            className="sticky bottom-1"
          />
        </div>
      )}
      <div
        className={cn(
          "flex min-w-0 max-w-[86%] flex-col gap-0.5 md:max-w-[min(78%,520px)]",
          isOwn ? "items-end" : "items-start",
        )}
      >
        {group.messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={isOwn}
            isFirst={index === 0}
            isLast={index === group.messages.length - 1}
            senderName={withAvatar && index === 0 ? sender?.username : undefined}
            senderSeed={group.senderId ?? undefined}
            onMenu={onMenu}
          />
        ))}
      </div>
    </div>
  );
}
