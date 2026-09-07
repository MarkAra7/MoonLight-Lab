import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi } from "@/api";
import { tokenStore } from "@/api";

const AuthContext = createContext(null);


async function fetchCurrentUser() {
  const { data } = await authApi.me();
  return data.data ?? data;
}


export function AuthProvider({ children }) {

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(tokenStore.get()));


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
    async (payload) => {
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

  const register = useCallback(async (payload) => {
    const { data } = await authApi.register(payload);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      
    } finally {
      tokenStore.clear();
      setUser(null);
    }
  }, []);

  const value = { user, loading, login, register, logout, refresh };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}