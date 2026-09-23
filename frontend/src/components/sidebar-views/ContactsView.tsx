import { MessageCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import type { ContactRead, UUID } from "../../api/types";
import { usersApi } from "../../api/users";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { useChatActions } from "../../hooks/useChatActions";
import { Avatar } from "../shared/Avatar";
import { IconButton } from "../shared/IconButton";
import styles from "./ContactsView.module.css";
import { AddContactSearch } from "./AddContactSearch";
import { ContactProfileView } from "./ContactProfileView";
import { ViewHeader } from "./ViewHeader";

export function ContactsView() {
  const { t } = useLocale();
  const { state, dispatch } = useStore();
  const actions = useChatActions();
  const [contacts, setContacts] = useState<ContactRead[] | null>(null);
  const [profileUserId, setProfileUserId] = useState<UUID | null>(null);
  const [profileAlias, setProfileAlias] = useState<string | null>(null);
  const onContactAdded = useCallback((contact: ContactRead) => {
    setContacts((prev) => {
      if (!prev) return [contact];
      if (prev.some((c) => c.user.id === contact.user.id)) return prev;
      return [contact, ...prev];
    });
    dispatch({ type: "users/known", users: [contact.user] });
  }, [dispatch]);

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

  if (profileUserId) {
    return (
      <ContactProfileView
        userId={profileUserId}
        alias={profileAlias}
        onBack={() => setProfileUserId(null)}
        onRemoved={() => {
          setContacts((prev) => prev?.filter((c) => c.user.id !== profileUserId) ?? null);
          setProfileUserId(null);
        }}
      />
    );
  }

  return (
    <>
      <ViewHeader title={t("contacts.title")} />
      <AddContactSearch onContactAdded={onContactAdded} />
      <div className={styles.list}>
        {contacts === null && <p className={styles.empty}>{t("common.loading")}</p>}
        {contacts?.length === 0 && <p className={styles.empty}>{t("common.empty")}</p>}
        {contacts?.map(({ user, alias }) => (
          <div key={user.id} className={styles.item}>
            <button
              type="button"
              className={styles.itemMain}
              onClick={() => {
                setProfileAlias(alias);
                setProfileUserId(user.id);
              }}
            >
              <Avatar
                name={alias ?? user.username}
                seed={user.id}
                mediaId={user.avatar_media_id}
                online={state.users.presence[user.id]?.online}
              />
              <div className={styles.body}>
                <span className={styles.name}>{alias ?? user.username}</span>
                <span className={styles.sub}>@{user.username}</span>
              </div>
            </button>
            <IconButton
              label={t("contacts.write")}
              className={styles.action}
              onClick={() => void actions.openDirectWith(user.id)}
            >
              <MessageCircle size={20} strokeWidth={1.75} />
            </IconButton>
          </div>
        ))}
      </div>
    </>
  );
}
