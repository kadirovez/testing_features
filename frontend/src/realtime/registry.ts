import type { OutgoingPayloads, ServerEvent, ServerEventType } from "./events";

type Handler<K extends ServerEventType> = (payload: OutgoingPayloads[K]) => void;

const handlers = new Map<ServerEventType, Set<Handler<ServerEventType>>>();

/** Subscribe to a server event; returns an unsubscribe function. */
export function onEvent<K extends ServerEventType>(type: K, handler: Handler<K>): () => void {
  const set = handlers.get(type) ?? new Set();
  set.add(handler as Handler<ServerEventType>);
  handlers.set(type, set);
  return () => set.delete(handler as Handler<ServerEventType>);
}

export function dispatchEvent(event: ServerEvent): void {
  handlers.get(event.type)?.forEach((handler) => handler(event.payload));
}
