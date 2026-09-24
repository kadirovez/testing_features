import { UserPlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "../../api/client";
import type { ContactRead, UserPublicRead } from "../../api/types";
import { usersApi } from "../../api/users";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { useChatActions } from "../../hooks/useChatActions";
import { cx } from "../../utils/cx";
import { Avatar } from "../shared/Avatar";
import { IconButton } from "../shared/IconButton";
import styles from "./AddContactSearch.module.css";

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

  return (
    <div className={styles.root}>
      <div className={cx(styles.morph, active && styles.morphActive)}>
        <div className={styles.morphInner}>
          <button
            type="button"
            className={cx(styles.addFace, active && styles.addFaceHidden)}
            onClick={open}
            tabIndex={active ? -1 : 0}
            aria-hidden={active}
          >
            <UserPlus size={22} strokeWidth={1.75} aria-hidden />
            <span>{t("contacts.add")}</span>
          </button>
          <div className={cx(styles.searchFace, active && styles.searchFaceVisible)} aria-hidden={!active}>
            <input
              ref={inputRef}
              className={styles.input}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value.replace(/^@+/, ""));
                setSelected(null);
                setError(null);
              }}
              placeholder={t("contacts.searchPlaceholder")}
              autoComplete="off"
              spellCheck={false}
              maxLength={32}
              disabled={!active || busy}
              tabIndex={active ? 0 : -1}
            />
            <IconButton label={t("common.close")} className={styles.close} onClick={close} disabled={busy}>
              <X size={20} strokeWidth={1.75} />
            </IconButton>
          </div>
        </div>
      </div>

      {active && (
        <div className={styles.panel}>
          {error && <p className={styles.error}>{error}</p>}
          {selected ? (
            <div className={styles.profile}>
              <button type="button" className={styles.backToResults} onClick={() => setSelected(null)}>
                {t("common.back")}
              </button>
              <Avatar name={selected.username} seed={selected.id} mediaId={selected.avatar_media_id} size="xl" />
              <h3 className={styles.profileName}>{selected.username}</h3>
              <p className={styles.profileHandle}>@{selected.username}</p>
              {selected.bio && <p className={styles.profileBio}>{selected.bio}</p>}
              <div className={styles.actions}>
                <button type="button" className={styles.primary} disabled={busy} onClick={() => void onStartChat()}>
                  {t("contacts.startChat")}
                </button>
                <button type="button" className={styles.secondary} disabled={busy} onClick={() => void onAddContact()}>
                  {t("contacts.saveContact")}
                </button>
              </div>
            </div>
          ) : (
            <>
              {searching && <p className={styles.status}>{t("common.loading")}</p>}
              {showEmpty && <p className={styles.status}>{t("contacts.userNotFound")}</p>}
              {results.length > 0 && (
                <ul className={styles.results}>
                  {results.map((user) => (
                    <li key={user.id}>
                      <button
                        type="button"
                        className={styles.resultItem}
                        onClick={() => {
                          setSelected(user);
                          setError(null);
                        }}
                      >
                        <Avatar name={user.username} seed={user.id} mediaId={user.avatar_media_id} size="md" />
                        <span className={styles.resultBody}>
                          <span className={styles.resultName}>{user.username}</span>
                          {user.bio && <span className={styles.resultSub}>{user.bio}</span>}
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
