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
    return <p className="p-6 text-center text-sm text-muted-foreground">{t("common.loading")}</p>;
  }

  let status: string;
  if (online) status = t("chat.online");
  else if (lastSeen) status = t("chat.lastSeen", { time: formatLastSeen(lastSeen, locale) });
  else status = t("chat.offline");

  return (
    <>
      <div className="flex flex-col items-center gap-1 px-4 pt-6 pb-4 text-center">
        <Avatar name={user.display_name} seed={user.id} mediaId={user.avatar_media_id} size="xl" online={online} />
        <h3 className="mt-3 max-w-full truncate text-lg font-semibold">{user.display_name}</h3>
        <span className="text-sm text-muted-foreground">{status}</span>
      </div>
      <div className="flex flex-col gap-1 border-t px-2 py-2">
        <div className="flex items-center gap-2 pr-2">
          <div className="min-w-0 flex-1">
            <InfoRow icon={AtSign} value={`@${user.username}`} label={t("info.username")} />
          </div>
          {!isSelf && <AddContactButton userId={userId} visible={isContact === false} onAdded={markContact} />}
        </div>
        {user.bio && <InfoRow icon={Info} value={user.bio} label={t("info.bio")} />}
      </div>
    </>
  );
}
