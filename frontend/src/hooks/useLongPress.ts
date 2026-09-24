import { useCallback, useRef, type PointerEvent } from "react";
import { config } from "../config";

const MOVE_TOLERANCE_PX = 10;

export interface LongPressHandlers {
  onPointerDown: (event: PointerEvent) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerMove: (event: PointerEvent) => void;
}

/** Touch-only long press; mouse users get the native contextmenu event instead. */
export function useLongPress(onLongPress: () => void, enabled: boolean): LongPressHandlers {
  const timer = useRef<number>();
  const origin = useRef<{ x: number; y: number } | null>(null);

  const cancel = useCallback(() => {
    window.clearTimeout(timer.current);
    origin.current = null;
  }, []);

  const onPointerDown = useCallback(
    (event: PointerEvent) => {
      if (!enabled || event.pointerType === "mouse") return;
      origin.current = { x: event.clientX, y: event.clientY };
      timer.current = window.setTimeout(() => {
        navigator.vibrate?.(10);
        onLongPress();
      }, config.longPressMs);
    },
    [enabled, onLongPress],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!origin.current) return;
      const dx = Math.abs(event.clientX - origin.current.x);
      const dy = Math.abs(event.clientY - origin.current.y);
      if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) cancel();
    },
    [cancel],
  );

  return { onPointerDown, onPointerUp: cancel, onPointerLeave: cancel, onPointerMove };
}
