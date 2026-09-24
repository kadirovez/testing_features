import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../api/auth";
import { ApiError, setUnauthorizedHandler } from "../api/client";
import { tokenStorage } from "../api/tokenStorage";
import type { LoginRequest, RegisterRequest } from "../api/types";
import { usersApi } from "../api/users";
import { config } from "../config";
import { useStore } from "./StoreContext";

type AuthStatus = "loading" | "guest" | "authed";

interface AuthValue {
  status: AuthStatus;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { dispatch } = useStore();
  const [status, setStatus] = useState<AuthStatus>(() =>
    tokenStorage.get() || config.useMocks ? "loading" : "guest",
  );

  const resetSession = useCallback(() => {
    tokenStorage.clear();
    dispatch({ type: "root/reset" });
    setStatus("guest");
  }, [dispatch]);

  const loadMe = useCallback(async () => {
    try {
      dispatch({ type: "users/me", user: await usersApi.me() });
      setStatus("authed");
    } catch (error) {
      if (error instanceof ApiError) resetSession();
      else if (error instanceof TypeError) setStatus("guest");
      else throw error;
    }
  }, [dispatch, resetSession]);

  useEffect(() => {
    setUnauthorizedHandler(resetSession);
    if (status === "loading") void loadMe();
  }, []); // bootstrap once on mount

  const login = useCallback(
    async (data: LoginRequest) => {
      tokenStorage.set(await authApi.login({ ...data, device_name: navigator.userAgent.slice(0, 255) }));
      await loadMe();
    },
    [loadMe],
  );

  const register = useCallback(
    async (data: RegisterRequest) => {
      tokenStorage.set(await authApi.register({ ...data, device_name: navigator.userAgent.slice(0, 255) }));
      await loadMe();
    },
    [loadMe],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      resetSession();
    }
  }, [resetSession]);

  const value = useMemo(() => ({ status, login, register, logout }), [status, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
