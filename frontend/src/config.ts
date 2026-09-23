const env = import.meta.env;

function resolveWsUrl(raw: string): string {
  if (/^wss?:\/\//.test(raw)) return raw;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${raw}`;
}

export const config = {
  apiUrl: (env.VITE_API_URL as string | undefined) ?? "/api",
  wsUrl: resolveWsUrl((env.VITE_WS_URL as string | undefined) ?? "/ws"),
  useMocks: env.VITE_USE_MOCKS === "true",
  pageSize: 30,
  wsPingIntervalMs: 25_000,
  messageGroupWindowMs: 5 * 60_000,
  longPressMs: 450,
} as const;
