import { useCallback, useEffect, useState } from "react";
import type { UUID } from "../api/types";
import { usersApi } from "../api/users";

export function useIsContact(userId: UUID | null): {
  isContact: boolean | null;
  markContact: () => void;
} {
  const [isContact, setIsContact] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsContact(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      setIsContact(null);
      let cursor: string | undefined;
      let found = false;
      try {
        do {
          const page = await usersApi.contacts(cursor);
          if (page.items.some((contact) => contact.user.id === userId)) {
            found = true;
            break;
          }
          cursor = page.next_cursor ?? undefined;
        } while (cursor);
      } catch {
        if (!cancelled) setIsContact(null);
        return;
      }
      if (!cancelled) setIsContact(found);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const markContact = useCallback(() => setIsContact(true), []);

  return { isContact, markContact };
}
