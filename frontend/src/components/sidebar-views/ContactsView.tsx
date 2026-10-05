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
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {contacts === null && <p className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</p>}
        {contacts?.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{t("common.empty")}</p>}
        {contacts?.map(({ user, alias }) => (
          <div key={user.id} className="group flex items-center gap-1 rounded-lg pr-1 transition-colors duration-150 hover:bg-accent">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
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
                previewOnClick={false}
              />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{alias ?? user.username}</span>
                <span className="truncate text-xs text-muted-foreground">@{user.username}</span>
              </div>
            </button>
            <IconButton
              label={t("contacts.write")}
              className="text-primary hover:bg-primary-soft hover:text-primary"
              onClick={() => void actions.openDirectWith(user.id)}
            >
              <MessageCircle strokeWidth={1.75} />
            </IconButton>
          </div>
        ))}
      </div>
    </>
  );
}
