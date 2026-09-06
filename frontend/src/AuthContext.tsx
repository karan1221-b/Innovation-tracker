import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiFetch, setToken, clearToken, getToken } from "@/src/api";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "customer" | "professional" | "admin";
  phone?: string;
  photo_url?: string;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: { name: string; email: string; password: string; phone?: string; role: string }) => Promise<User>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
};

const AuthContext = createContext<AuthState>({} as AuthState);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const token = await getToken();
      if (token) {
        const me = await apiFetch<User>("/auth/me");
        setUserState(me);
      }
    } catch {
      await clearToken();
      setUserState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = async (email: string, password: string) => {
    const res = await apiFetch<{ access_token: string; user: User }>("/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password },
    });
    await setToken(res.access_token);
    setUserState(res.user);
    return res.user;
  };

  const register = async (payload: any) => {
    const res = await apiFetch<{ access_token: string; user: User }>("/auth/register", {
      method: "POST",
      auth: false,
      body: payload,
    });
    await setToken(res.access_token);
    setUserState(res.user);
    return res.user;
  };

  const logout = async () => {
    await clearToken();
    setUserState(null);
  };

  const deleteAccount = async () => {
    await apiFetch("/auth/me", { method: "DELETE" });
    await clearToken();
    setUserState(null);
  };

  const refresh = async () => {
    try {
      const me = await apiFetch<User>("/auth/me");
      setUserState(me);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, deleteAccount, refresh, setUser: setUserState }}>
      {children}
    </AuthContext.Provider>
  );
}
