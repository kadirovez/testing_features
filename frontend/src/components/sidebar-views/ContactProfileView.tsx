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
import profileStyles from "./ContactProfileView.module.css";
import styles from "./views.module.css";

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
        <p className={styles.loading}>{t("common.loading")}</p>
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
      <div className={styles.scroll}>
        <div className={styles.hero}>
          <Avatar
            name={displayName}
            seed={user.id}
            mediaId={user.avatar_media_id}
            size="xl"
            online={online}
          />
          <h3 className={styles.heroName}>{displayName}</h3>
          <span className={styles.heroSub}>{status}</span>
        </div>
        <div className={styles.section}>
          <InfoRow icon={AtSign} value={`@${user.username}`} label={t("info.username")} />
          {user.bio && <InfoRow icon={Info} value={user.bio} label={t("info.bio")} />}
        </div>
        <div className={profileStyles.footer}>
          <button type="button" className={profileStyles.remove} onClick={() => setConfirmOpen(true)}>
            {t("contacts.remove")}
          </button>
        </div>
      </div>
      <Modal open={confirmOpen} title={t("contacts.removeConfirmTitle")} onClose={() => !removing && setConfirmOpen(false)}>
        <div className={profileStyles.confirmBody}>
          <p className={profileStyles.confirmText}>{t("contacts.removeConfirmBody")}</p>
          <div className={profileStyles.confirmActions}>
            <button type="button" className={profileStyles.confirmCancel} disabled={removing} onClick={() => setConfirmOpen(false)}>
              {t("common.cancel")}
            </button>
            <button type="button" className={profileStyles.confirmOk} disabled={removing} onClick={() => void onConfirmRemove()}>
              {t("contacts.remove")}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
