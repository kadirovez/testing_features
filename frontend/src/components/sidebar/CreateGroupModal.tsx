import { Check, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "../../api/client";
import type { ContactRead, UserPublicRead, UUID } from "../../api/types";
import { usersApi } from "../../api/users";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { useChatActions } from "../../hooks/useChatActions";
import { buildGroupTitle } from "../../utils/groupTitle";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "../shared/Avatar";
import { Modal } from "../shared/Modal";

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
    <Modal open={open} title={t("group.createTitle")} onClose={() => !busy && onClose()} className="max-w-md">
      <div className="flex min-h-0 flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" strokeWidth={1.75} aria-hidden />
          <Input
            ref={inputRef}
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("group.searchPlaceholder")}
            aria-label={t("group.searchPlaceholder")}
            disabled={busy}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {t("group.selectedCount", { count: selected.size, max: MAX_GROUP_MEMBERS })}
        </p>
        <ul className="-mx-2 flex max-h-[min(360px,50dvh)] flex-col gap-px overflow-y-auto">
          {pool.map((user) => {
            const isOn = selected.has(user.id);
            const disabled = !isOn && selected.size >= MAX_GROUP_MEMBERS;
            return (
              <li key={user.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isOn}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors duration-150 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
                    isOn && "bg-primary-soft hover:bg-primary-soft",
                  )}
                  disabled={disabled || busy}
                  onClick={() => toggle(user.id)}
                >
                  <Avatar name={user.display_name} seed={user.id} mediaId={user.avatar_media_id} size="md" previewOnClick={false} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{user.display_name}</span>
                    <span className="truncate text-xs text-muted-foreground">@{user.username}</span>
                  </div>
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors duration-150",
                      isOn ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                    aria-hidden
                  >
                    {isOn && <Check className="size-3" strokeWidth={3} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {contacts === null && <p className="py-2 text-center text-sm text-muted-foreground">{t("common.loading")}</p>}
        {showEmpty && <p className="py-2 text-center text-sm text-muted-foreground">{t("contacts.userNotFound")}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <footer className="flex justify-end gap-2 pt-1">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button disabled={busy || selected.size === 0} onClick={() => void onCreate()}>
            {t("group.createAction")}
          </Button>
        </footer>
      </div>
    </Modal>
  );
}
