import { ChevronRight } from "lucide-react";
import type { ChatMemberRead, UUID } from "../../api/types";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { Avatar } from "../shared/Avatar";
import styles from "./GroupMembersList.module.css";

interface GroupMembersListProps {
  chatId: UUID;
  onSelectMember: (userId: UUID) => void;
}

export function GroupMembersList({ chatId, onSelectMember }: GroupMembersListProps) {
  const { t } = useLocale();
  const { state } = useStore();
  const members = state.users.members[chatId];

  if (!members?.length) {
    return <p className={styles.empty}>{t("common.loading")}</p>;
  }

  const sorted = [...members].sort((a, b) =>
    a.user.display_name.localeCompare(b.user.display_name, undefined, { sensitivity: "base" }),
  );

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>{t("info.membersTitle", { count: members.length })}</h4>
      <ul className={styles.list}>
        {sorted.map((member: ChatMemberRead) => (
          <li key={member.user.id}>
            <button type="button" className={styles.row} onClick={() => onSelectMember(member.user.id)}>
              <Avatar
                name={member.user.display_name}
                seed={member.user.id}
                mediaId={member.user.avatar_media_id}
                size="md"
              />
              <div className={styles.rowText}>
                <span className={styles.name}>{member.user.display_name}</span>
                <span className={styles.sub}>@{member.user.username}</span>
              </div>
              <ChevronRight size={18} strokeWidth={1.75} className={styles.chevron} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
