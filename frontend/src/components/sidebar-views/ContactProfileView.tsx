import { AtSign, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import type { UUID } from "../../api/types";
import { usersApi } from "../../api/users";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { formatLastSeen } from "../../utils/formatTime";
import { Avatar } from "../shared/Avatar";
import { InfoRow } from "../shared/InfoRow";
import { Modal } from "../shared/Modal";
import { ViewHeader } from "./ViewHeader";
import { Button } from "@/components/ui/button";

interface ContactProfileViewProps {
  userId: UUID;
  alias: string | null;
  onBack: () => void;
  onRemoved: () => void;
}

export function ContactProfileView({ userId, alias, onBack, onRemoved }: ContactProfileViewProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const { state, dispatch } = useStore();
  const { t, locale } = useLocale();
  const user = state.users.byId[userId];
  const presence = state.users.presence[userId];
  const online = presence?.online ?? false;
  const lastSeen = presence?.lastSeenAt ?? user?.last_seen_at ?? null;

  useEffect(() => {
    void usersApi
      .get(userId)
      .then((profile) => dispatch({ type: "users/known", users: [profile] }))
      .catch((error: unknown) => {
        if (!(error instanceof ApiError)) throw error;
      });
  }, [dispatch, userId]);

  if (!user) {
    return (
      <>
        <ViewHeader title={t("common.loading")} onBack={onBack} />
        <p className="p-6 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
      </>
    );
  }

  const displayName = alias ?? user.username;
  let status: string;
  if (online) status = t("chat.online");
  else if (lastSeen) status = t("chat.lastSeen", { time: formatLastSeen(lastSeen, locale) });
  else status = t("chat.offline");

  const onConfirmRemove = async () => {
    setRemoving(true);
    try {
      await usersApi.removeContact(userId);
      setConfirmOpen(false);
      onRemoved();
    } catch (error: unknown) {
      if (!(error instanceof ApiError)) throw error;
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <ViewHeader title={displayName} onBack={onBack} />
      <div className="min-h-0 flex-1 overflow-y-auto pb-6">
        <div className="flex flex-col items-center gap-1 px-4 pt-6 pb-5 text-center">
          <Avatar
            name={displayName}
            seed={user.id}
            mediaId={user.avatar_media_id}
            size="xl"
            online={online}
          />
          <h3 className="mt-3 max-w-full truncate text-lg font-semibold">{displayName}</h3>
          <span className="text-sm text-muted-foreground">{status}</span>
        </div>
        <div className="flex flex-col gap-1 border-t px-2 py-2">
          <InfoRow icon={AtSign} value={`@${user.username}`} label={t("info.username")} />
          {user.bio && <InfoRow icon={Info} value={user.bio} label={t("info.bio")} />}
        </div>
        <div className="border-t px-4 pt-4">
          <Button
            variant="ghost"
            className="w-full text-destructive hover:bg-destructive-soft hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            {t("contacts.remove")}
          </Button>
        </div>
      </div>
      <Modal
        open={confirmOpen}
        title={t("contacts.removeConfirmTitle")}
        onClose={() => !removing && setConfirmOpen(false)}
        className="max-w-sm"
      >
        <p className="text-sm text-muted-foreground">{t("contacts.removeConfirmBody")}</p>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" disabled={removing} onClick={() => setConfirmOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" disabled={removing} onClick={() => void onConfirmRemove()}>
            {t("contacts.remove")}
          </Button>
        </div>
      </Modal>
    </>
  );
}
