import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { authApi, tokenStore } from "@/api";
import type { AuthResponse, LoginPayload, RegisterPayload } from "@/api";
import type { User } from "@/api/types";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<AuthResponse>;
  register: (payload: RegisterPayload) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchCurrentUser(): Promise<User> {
  const { data } = await authApi.me();
  // `/user` is a UserResource (wrapped in `{ data: ... }`); tolerate an unwrapped user too.
  return "data" in data ? data.data : data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(tokenStore.get()));

  useEffect(() => {
    if (!tokenStore.get()) {
      return;
    }
    let active = true;
    (async () => {
      try {
        const nextUser = await fetchCurrentUser();
        if (active) setUser(nextUser);
      } catch {
        if (active) {
          tokenStore.clear();
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null);
      return;
    }
    try {
      const nextUser = await fetchCurrentUser();
      setUser(nextUser);
    } catch {
      tokenStore.clear();
      setUser(null);
    }
  }, []);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const { data } = await authApi.login(payload);
      const token = data.access_token ?? data.token ?? data.data?.token;
      if (!token) {
        throw new Error("Login response did not contain a token.");
      }
      tokenStore.set(token);
      await refresh();
      return data;
    },
    [refresh]
  );

  const register = useCallback(async (payload: RegisterPayload) => {
    const { data } = await authApi.register(payload);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore — the token is cleared below regardless
    } finally {
      tokenStore.clear();
      setUser(null);
    }
  }, []);

  const value: AuthContextValue = { user, loading, login, register, logout, refresh };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}