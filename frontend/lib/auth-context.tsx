"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { api, clearToken, getToken, setToken } from "@/lib/api";
import type { AuthResponse, Permission, Role, User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
  /** Mirrors the API's Gate checks, including the super-admin bypass (`Gate::before`). */
  hasPermission: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Always starts true (on the server, and on the client's first hydration pass) so the
  // two renders match exactly; getToken() reads localStorage, which only the effect below
  // may safely do, since that's guaranteed to run after hydration completes.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();

    Promise.resolve()
      .then(() => (token ? api.get<User>("/user") : null))
      .then((fetchedUser) => {
        if (fetchedUser) setUser(fetchedUser);
      })
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<AuthResponse>("/auth/login", { email, password });
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, passwordConfirmation: string) => {
      const data = await api.post<AuthResponse>("/auth/register", {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      setToken(data.token);
      setUser(data.user);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Token may already be invalid/expired server-side; clear local state regardless.
    } finally {
      clearToken();
      setUser(null);
    }
  }, []);

  const hasRole = useCallback((role: Role) => user?.roles.includes(role) ?? false, [user]);
  const hasAnyRole = useCallback((roles: Role[]) => roles.some((role) => user?.roles.includes(role)), [user]);
  const hasPermission = useCallback(
    (permission: Permission) =>
      Boolean(user && (user.roles.includes("super-admin") || user.permissions?.includes(permission))),
    [user]
  );

  const value = useMemo(
    () => ({ user, loading, login, register, logout, hasRole, hasAnyRole, hasPermission }),
    [user, loading, login, register, logout, hasRole, hasAnyRole, hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
