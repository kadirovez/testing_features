import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import type { ContactRead } from "../../api/types";
import { usersApi } from "../../api/users";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { useChatActions } from "../../hooks/useChatActions";
import { Avatar } from "../shared/Avatar";
import { IconButton } from "../shared/IconButton";
import styles from "./ContactsView.module.css";
import { ViewHeader } from "./ViewHeader";

export function ContactsView() {
  const { t } = useLocale();
  const { state, dispatch } = useStore();
  const actions = useChatActions();
  const [contacts, setContacts] = useState<ContactRead[] | null>(null);

  useEffect(() => {
    usersApi
      .contacts()
      .then((page) => {
        setContacts(page.items);
        dispatch({ type: "users/known", users: page.items.map((c) => c.user) });
      })
      .catch((error: unknown) => {
        if (!(error instanceof ApiError)) throw error;
        setContacts([]);
      });
  }, [dispatch]);

  return (
    <>
      <ViewHeader title={t("contacts.title")} />
      <div className={styles.list}>
        {contacts === null && <p className={styles.empty}>{t("common.loading")}</p>}
        {contacts?.length === 0 && <p className={styles.empty}>{t("common.empty")}</p>}
        {contacts?.map(({ user, alias }) => (
          <div
            key={user.id}
            role="button"
            tabIndex={0}
            className={styles.item}
            onClick={() => void actions.openDirectWith(user.id)}
            onKeyDown={(e) => e.key === "Enter" && void actions.openDirectWith(user.id)}
          >
            <Avatar
              name={alias ?? user.display_name}
              seed={user.id}
              mediaId={user.avatar_media_id}
              online={state.users.presence[user.id]?.online}
            />
            <div className={styles.body}>
              <span className={styles.name}>{alias ?? user.display_name}</span>
              <span className={styles.sub}>@{user.username}</span>
            </div>
            <IconButton label={t("contacts.write")} className={styles.action}>
              <MessageCircle size={20} strokeWidth={1.75} />
            </IconButton>
          </div>
        ))}
      </div>
    </>
  );
}
