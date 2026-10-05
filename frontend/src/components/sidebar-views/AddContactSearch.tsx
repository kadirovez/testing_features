import { UserPlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "../../api/client";
import type { ContactRead, UserPublicRead } from "../../api/types";
import { usersApi } from "../../api/users";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { useChatActions } from "../../hooks/useChatActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "../shared/Avatar";
import { IconButton } from "../shared/IconButton";

const SEARCH_DEBOUNCE_MS = 220;

interface AddContactSearchProps {
  onContactAdded: (contact: ContactRead) => void;
}

export function AddContactSearch({ onContactAdded }: AddContactSearchProps) {
  const { t } = useLocale();
  const { state, dispatch } = useStore();
  const actions = useChatActions();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchSeq = useRef(0);

  const [active, setActive] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserPublicRead[]>([]);
  const [selected, setSelected] = useState<UserPublicRead | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (active) inputRef.current?.focus();
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const needle = query.trim().replace(/^@+/, "");
    if (!needle) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const seq = ++searchSeq.current;
    const timer = window.setTimeout(() => {
      void usersApi
        .search(needle)
        .then((page) => {
          if (seq !== searchSeq.current) return;
          const meId = state.users.me?.id;
          const items = page.items.filter((user) => user.id !== meId);
          setResults(items);
          if (items.length) dispatch({ type: "users/known", users: items });
        })
        .catch((err: unknown) => {
          if (!(err instanceof ApiError)) throw err;
          setError(err.message);
          setResults([]);
        })
        .finally(() => {
          if (seq === searchSeq.current) setSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [active, query, dispatch, state.users.me?.id]);

  const close = () => {
    searchSeq.current += 1;
    setActive(false);
    setQuery("");
    setResults([]);
    setSelected(null);
    setError(null);
    setBusy(false);
  };

  const open = () => setActive(true);

  const ensureContact = async (user: UserPublicRead): Promise<ContactRead> => {
    try {
      return await usersApi.addContact(user.id);
    } catch (err) {
      if (err instanceof ApiError && err.code === "contact_already_exists") {
        return { user, alias: null, created_at: new Date().toISOString() };
      }
      throw err;
    }
  };

  const onAddContact = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      onContactAdded(await ensureContact(selected));
      close();
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onStartChat = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      onContactAdded(await ensureContact(selected));
      await actions.openDirectWith(selected.id);
      close();
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const needle = query.trim().replace(/^@+/, "");
  const showEmpty = active && needle.length > 0 && !searching && results.length === 0 && !selected;

  const status = "py-3 text-center text-sm text-muted-foreground";

  return (
    <div className="shrink-0 px-3 pt-3 pb-2">
      {active ? (
        <div className="relative animate-in fade-in-0 duration-200">
          <Input
            ref={inputRef}
            className="h-10 pr-10"
            value={query}
            aria-label={t("contacts.searchPlaceholder")}
            onChange={(e) => {
              setQuery(e.target.value.replace(/^@+/, ""));
              setSelected(null);
              setError(null);
            }}
            placeholder={t("contacts.searchPlaceholder")}
            autoComplete="off"
            spellCheck={false}
            maxLength={32}
            disabled={busy}
          />
          <IconButton
            label={t("common.close")}
            className="absolute top-1/2 right-1 size-8 -translate-y-1/2"
            onClick={close}
            disabled={busy}
          >
            <X className="size-4" strokeWidth={1.75} />
          </IconButton>
        </div>
      ) : (
        <Button className="h-10 w-full" onClick={open}>
          <UserPlus strokeWidth={1.75} aria-hidden />
          {t("contacts.add")}
        </Button>
      )}

      {active && (
        <div className="mt-2 rounded-lg border bg-card animate-in fade-in-0 slide-in-from-top-1 duration-200 empty:hidden">
          {error && (
            <p role="alert" className="px-3 pt-3 text-sm text-destructive">
              {error}
            </p>
          )}
          {selected ? (
            <div className="relative flex flex-col items-center gap-1 px-4 pt-10 pb-4 text-center">
              <Button variant="ghost" size="sm" className="absolute top-2 left-2" onClick={() => setSelected(null)}>
                {t("common.back")}
              </Button>
              <Avatar name={selected.username} seed={selected.id} mediaId={selected.avatar_media_id} size="xl" />
              <h3 className="mt-3 max-w-full truncate text-lg font-semibold">{selected.username}</h3>
              <p className="text-sm text-muted-foreground">@{selected.username}</p>
              {selected.bio && <p className="mt-1 text-sm whitespace-pre-wrap">{selected.bio}</p>}
              <div className="mt-4 flex w-full flex-col gap-2">
                <Button disabled={busy} onClick={() => void onStartChat()}>
                  {t("contacts.startChat")}
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => void onAddContact()}>
                  {t("contacts.saveContact")}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {searching && <p className={status}>{t("common.loading")}</p>}
              {showEmpty && <p className={status}>{t("contacts.userNotFound")}</p>}
              {results.length > 0 && (
                <ul className="flex max-h-60 flex-col overflow-y-auto p-1">
                  {results.map((user) => (
                    <li key={user.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors duration-150 hover:bg-accent"
                        onClick={() => {
                          setSelected(user);
                          setError(null);
                        }}
                      >
                        <Avatar
                          name={user.username}
                          seed={user.id}
                          mediaId={user.avatar_media_id}
                          size="md"
                          previewOnClick={false}
                        />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium">{user.username}</span>
                          {user.bio && <span className="truncate text-xs text-muted-foreground">{user.bio}</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
