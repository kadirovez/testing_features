import { http } from "./client";
import type { LoginRequest, RegisterRequest, TokenPair } from "./types";

export const authApi = {
  register: (data: RegisterRequest) => http.post<TokenPair>("/auth/register", data, false),
  login: (data: LoginRequest) => http.post<TokenPair>("/auth/login", data, false),
  logout: () => http.post<void>("/auth/logout"),
};
