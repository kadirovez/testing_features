import { AtSign, Info } from "lucide-react";
import { useEffect } from "react";
import { ApiError } from "../../api/client";
import type { UUID } from "../../api/types";
import { usersApi } from "../../api/users";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { useIsContact } from "../../hooks/useIsContact";
import { formatLastSeen } from "../../utils/formatTime";
import { Avatar } from "../shared/Avatar";
import { InfoRow } from "../shared/InfoRow";
import { AddContactButton } from "./AddContactButton";
import styles from "./InfoMemberProfile.module.css";

interface InfoMemberProfileProps {
  userId: UUID;
}

export function InfoMemberProfile({ userId }: InfoMemberProfileProps) {
  const { state, dispatch } = useStore();
  const { t, locale } = useLocale();
  const user = state.users.byId[userId];
  const { isContact, markContact } = useIsContact(userId);
  const presence = state.users.presence[userId];
  const online = presence?.online ?? false;
  const lastSeen = presence?.lastSeenAt ?? user?.last_seen_at ?? null;
  const isSelf = state.users.me?.id === userId;

  useEffect(() => {
    void usersApi
      .get(userId)
      .then((profile) => dispatch({ type: "users/known", users: [profile] }))
      .catch((error: unknown) => {
        if (!(error instanceof ApiError)) throw error;
      });
  }, [dispatch, userId]);

  if (!user) {
    return <p className={styles.loading}>{t("common.loading")}</p>;
  }

  let status: string;
  if (online) status = t("chat.online");
  else if (lastSeen) status = t("chat.lastSeen", { time: formatLastSeen(lastSeen, locale) });
  else status = t("chat.offline");

  return (
    <>
      <div className={styles.hero}>
        <Avatar name={user.display_name} seed={user.id} mediaId={user.avatar_media_id} size="xl" online={online} />
        <h3 className={styles.name}>{user.display_name}</h3>
        <span className={styles.status}>{status}</span>
      </div>
      <div className={styles.details}>
        <div className={styles.usernameRow}>
          <div className={styles.usernameRowMain}>
            <InfoRow icon={AtSign} value={`@${user.username}`} label={t("info.username")} />
          </div>
          {!isSelf && <AddContactButton userId={userId} visible={isContact === false} onAdded={markContact} />}
        </div>
        {user.bio && <InfoRow icon={Info} value={user.bio} label={t("info.bio")} />}
      </div>
    </>
  );
}
