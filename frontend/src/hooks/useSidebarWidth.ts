import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const STORAGE_KEY = "messenger.sidebarWidth";
const DEFAULT_WIDTH = 340;
const MIN_WIDTH = 260;
const MAX_WIDTH = 520;
const MIN_CHAT_WIDTH = 320;
const INFO_PANEL_WIDTH = 320;

function readStoredWidth(): number {
  const raw = localStorage.getItem(STORAGE_KEY);
  const value = raw ? Number(raw) : NaN;
  if (!Number.isFinite(value)) return DEFAULT_WIDTH;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value));
}

function clampWidth(width: number, infoOpen: boolean): number {
  const reserved = infoOpen ? INFO_PANEL_WIDTH : 0;
  const max = Math.min(MAX_WIDTH, window.innerWidth - MIN_CHAT_WIDTH - reserved);
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.min(width, Math.max(MIN_WIDTH, max))));
}

export function useSidebarWidth(infoOpen: boolean) {
  const [width, setWidth] = useState(readStoredWidth);
  const [resizing, setResizing] = useState(false);
  const widthRef = useRef(width);
  widthRef.current = width;

  const applyWidth = useCallback(
    (next: number) => {
      const clamped = clampWidth(next, infoOpen);
      widthRef.current = clamped;
      setWidth(clamped);
    },
    [infoOpen],
  );

  useEffect(() => {
    applyWidth(widthRef.current);
  }, [applyWidth]);

  const onResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      const startX = event.clientX;
      const startWidth = widthRef.current;
      setResizing(true);

      const onMove = (moveEvent: PointerEvent) => {
        applyWidth(startWidth + (moveEvent.clientX - startX));
      };

      const onUp = () => {
        setResizing(false);
        localStorage.setItem(STORAGE_KEY, String(widthRef.current));
        document.body.style.removeProperty("cursor");
        document.body.style.removeProperty("user-select");
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [applyWidth],
  );

  return { width, resizing, onResizePointerDown };
}
