import { config } from "../config";
import { mockRequest } from "../mocks/handlers";
import { tokenStorage } from "./tokenStorage";
import type { ApiErrorDetail, TokenPair } from "./types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
type Query = Record<string, string | number | undefined | null>;

interface RequestOptions {
  query?: Query;
  body?: unknown;
  auth?: boolean;
}

let locale = "ru";
let onUnauthorized: () => void = () => undefined;
let refreshInFlight: Promise<boolean> | null = null;

export function setClientLocale(value: string): void {
  locale = value;
}

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) params.set(key, String(value));
  });
  const qs = params.toString();
  return `${config.apiUrl}${path}${qs ? `?${qs}` : ""}`;
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const data = (await response.json()) as { detail?: ApiErrorDetail };
    return new ApiError(response.status, data.detail?.code ?? "unknown", data.detail?.message ?? response.statusText);
  } catch {
    return new ApiError(response.status, "unknown", response.statusText);
  }
}

async function refreshTokens(): Promise<boolean> {
  const stored = tokenStorage.get();
  if (!stored) return false;
  const response = await fetch(buildUrl("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept-Language": locale },
    body: JSON.stringify({ refresh_token: stored.refreshToken }),
  });
  if (!response.ok) return false;
  tokenStorage.set((await response.json()) as TokenPair);
  return true;
}

// Concurrent 401s share a single refresh call, since refresh tokens rotate.
export function ensureFreshTokens(): Promise<boolean> {
  refreshInFlight ??= refreshTokens().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function send(method: Method, path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { "Accept-Language": locale };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const token = tokenStorage.get()?.accessToken;
  if (options.auth !== false && token) headers.Authorization = `Bearer ${token}`;
  return fetch(buildUrl(path, options.query), {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

export async function request<T>(method: Method, path: string, options: RequestOptions = {}): Promise<T> {
  if (config.useMocks) return mockRequest<T>(method, path, options.query, options.body);

  let response = await send(method, path, options);
  if (response.status === 401 && options.auth !== false) {
    if (await ensureFreshTokens()) {
      response = await send(method, path, options);
    } else {
      tokenStorage.clear();
      onUnauthorized();
    }
  }
  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const http = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path, { query }),
  post: <T>(path: string, body?: unknown, auth = true) => request<T>("POST", path, { body, auth }),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, { body }),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, { body }),
  delete: <T = void>(path: string) => request<T>("DELETE", path),
};
