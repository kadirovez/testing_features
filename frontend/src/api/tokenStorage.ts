import type { TokenPair } from "./types";

const KEY = "messenger.tokens";

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export const tokenStorage = {
  get(): StoredTokens | null {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredTokens;
    } catch {
      return null;
    }
  },
  set(pair: TokenPair): void {
    const value: StoredTokens = { accessToken: pair.access_token, refreshToken: pair.refresh_token };
    localStorage.setItem(KEY, JSON.stringify(value));
  },
  clear(): void {
    localStorage.removeItem(KEY);
  },
};
