import { useCallback, useEffect, useRef } from "react";
import type { UUID } from "../api/types";
import { realtime } from "../realtime/socket";

const IDLE_MS = 4000;

/** Sends typing_start once per burst and typing_stop after a pause. */
export function useTypingNotifier(chatId: UUID): (isTyping: boolean) => void {
  const typing = useRef(false);
  const idleTimer = useRef<number>();

  const stop = useCallback(() => {
    window.clearTimeout(idleTimer.current);
    if (!typing.current) return;
    typing.current = false;
    realtime.send({ type: "typing_stop", payload: { chat_id: chatId } });
  }, [chatId]);

  useEffect(() => stop, [stop]);

  return useCallback(
    (isTyping: boolean) => {
      if (!isTyping) return stop();
      if (!typing.current) {
        typing.current = true;
        realtime.send({ type: "typing_start", payload: { chat_id: chatId } });
      }
      window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(stop, IDLE_MS);
    },
    [chatId, stop],
  );
}
