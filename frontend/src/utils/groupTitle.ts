import type { UserBrief } from "../api/types";

/** Build a short group title from member display names. */
export function buildGroupTitle(members: UserBrief[], fallback: string): string {
  if (members.length === 0) return fallback;
  const names = members.slice(0, 3).map((m) => m.display_name);
  if (members.length > 3) return `${names.join(", ")}…`;
  return names.join(", ");
}
