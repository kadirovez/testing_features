import { Check, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "../../api/client";
import type { ContactRead, UserPublicRead, UUID } from "../../api/types";
import { usersApi } from "../../api/users";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { useChatActions } from "../../hooks/useChatActions";
import { buildGroupTitle } from "../../utils/groupTitle";
import { cx } from "../../utils/cx";
import { Avatar } from "../shared/Avatar";
import { Modal } from "../shared/Modal";
import styles from "./CreateGroupModal.module.css";

const SEARCH_DEBOUNCE_MS = 220;
export const MAX_GROUP_MEMBERS = 20;

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateGroupModal({ open, onClose }: CreateGroupModalProps) {
  const { t } = useLocale();
  const { state, dispatch } = useStore();
  const { createGroup } = useChatActions();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchSeq = useRef(0);

  const [contacts, setContacts] = useState<ContactRead[] | null>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserPublicRead[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Set<UUID>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meId = state.users.me?.id;

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSearchResults([]);
    setSelected(new Set());
    setError(null);
    setBusy(false);
    void usersApi
      .contacts()
      .then((page) => setContacts(page.items))
      .catch(() => setContacts([]));
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const needle = query.trim().replace(/^@+/, "");
    if (!needle) {
      setSearchResults([]);
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
          const items = page.items.filter((user) => user.id !== meId);
          setSearchResults(items);
          if (items.length) dispatch({ type: "users/known", users: items });
        })
        .catch((err: unknown) => {
          if (!(err instanceof ApiError)) throw err;
          setSearchResults([]);
        })
        .finally(() => {
          if (seq === searchSeq.current) setSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [open, query, dispatch, meId]);

  const pool = useMemo(() => {
    const byId = new Map<UUID, UserPublicRead>();
    contacts?.forEach((c) => byId.set(c.user.id, c.user));
    searchResults.forEach((u) => byId.set(u.id, u));
    return [...byId.values()].filter((u) => u.id !== meId);
  }, [contacts, searchResults, meId]);

  const toggle = (userId: UUID) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else if (next.size < MAX_GROUP_MEMBERS) next.add(userId);
      return next;
    });
  };

  const onCreate = async () => {
    if (selected.size === 0 || busy) return;
    setBusy(true);
    setError(null);
    const memberIds = [...selected];
    const users = memberIds.map((id) => state.users.byId[id] ?? pool.find((u) => u.id === id)!);
    const title = buildGroupTitle(users, t("group.defaultTitle"));
    try {
      await createGroup(title, memberIds);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
      else throw err;
    } finally {
      setBusy(false);
    }
  };

  const needle = query.trim();
  const showEmpty = needle.length > 0 && !searching && pool.length === 0;

  return (
    <Modal open={open} title={t("group.createTitle")} onClose={() => !busy && onClose()}>
      <div className={styles.body}>
        <div className={styles.search}>
          <Search size={18} strokeWidth={1.75} className={styles.searchIcon} aria-hidden />
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("group.searchPlaceholder")}
            disabled={busy}
          />
        </div>
        <p className={styles.counter}>
          {t("group.selectedCount", { count: selected.size, max: MAX_GROUP_MEMBERS })}
        </p>
        <ul className={styles.list}>
          {pool.map((user) => {
            const isOn = selected.has(user.id);
            const disabled = !isOn && selected.size >= MAX_GROUP_MEMBERS;
            return (
              <li key={user.id}>
                <button
                  type="button"
                  className={cx(styles.row, isOn && styles.rowSelected, disabled && styles.rowDisabled)}
                  disabled={disabled || busy}
                  onClick={() => toggle(user.id)}
                >
                  <Avatar name={user.display_name} seed={user.id} mediaId={user.avatar_media_id} size="md" />
                  <div className={styles.rowText}>
                    <span className={styles.rowName}>{user.display_name}</span>
                    <span className={styles.rowSub}>@{user.username}</span>
                  </div>
                  <span className={cx(styles.check, isOn && styles.checkOn)} aria-hidden>
                    {isOn && <Check size={14} strokeWidth={2.5} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {contacts === null && <p className={styles.status}>{t("common.loading")}</p>}
        {showEmpty && <p className={styles.status}>{t("contacts.userNotFound")}</p>}
        {error && <p className={styles.error}>{error}</p>}
        <footer className={styles.footer}>
          <button type="button" className={styles.cancel} disabled={busy} onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className={styles.create}
            disabled={busy || selected.size === 0}
            onClick={() => void onCreate()}
          >
            {t("group.createAction")}
          </button>
        </footer>
      </div>
    </Modal>
  );
}
