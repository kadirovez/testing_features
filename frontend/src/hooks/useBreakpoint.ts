import { useSyncExternalStore } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop";

// Keep in sync with @media rules in CSS modules.
export const BREAKPOINTS = { tablet: 768, desktop: 1100 } as const;

const queries = {
  desktop: `(min-width: ${BREAKPOINTS.desktop}px)`,
  tablet: `(min-width: ${BREAKPOINTS.tablet}px)`,
};

function getBreakpoint(): Breakpoint {
  if (window.matchMedia(queries.desktop).matches) return "desktop";
  if (window.matchMedia(queries.tablet).matches) return "tablet";
  return "mobile";
}

function subscribe(onChange: () => void): () => void {
  const lists = Object.values(queries).map((q) => window.matchMedia(q));
  lists.forEach((list) => list.addEventListener("change", onChange));
  return () => lists.forEach((list) => list.removeEventListener("change", onChange));
}

export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(subscribe, getBreakpoint);
}
