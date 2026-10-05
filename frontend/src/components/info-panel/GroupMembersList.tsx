import { ChevronRight } from "lucide-react";
import type { ChatMemberRead, UUID } from "../../api/types";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { Avatar } from "../shared/Avatar";

interface GroupMembersListProps {
  chatId: UUID;
  onSelectMember: (userId: UUID) => void;
}

export function GroupMembersList({ chatId, onSelectMember }: GroupMembersListProps) {
  const { t } = useLocale();
  const { state } = useStore();
  const members = state.users.members[chatId];

  if (!members?.length) {
    return <p className="border-t px-4 py-4 text-sm text-muted-foreground">{t("common.loading")}</p>;
  }

  const sorted = [...members].sort((a, b) =>
    a.user.display_name.localeCompare(b.user.display_name, undefined, { sensitivity: "base" }),
  );

  return (
    <section className="border-t px-2 py-2">
      <h4 className="px-2 pt-1 pb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("info.membersTitle", { count: members.length })}</h4>
      <ul className="flex flex-col">
        {sorted.map((member: ChatMemberRead) => (
          <li key={member.user.id}>
            <button
              type="button"
              className="group flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors duration-150 hover:bg-accent"
              onClick={() => onSelectMember(member.user.id)}
            >
              <Avatar
                name={member.user.display_name}
                seed={member.user.id}
                mediaId={member.user.avatar_media_id}
                size="md"
                previewOnClick={false}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{member.user.display_name}</span>
                <span className="truncate text-xs text-muted-foreground">@{member.user.username}</span>
              </div>
              <ChevronRight className="size-4 text-subtle transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={1.75} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
