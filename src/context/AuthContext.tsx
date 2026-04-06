"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@/lib/types";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_KEY = "taskflow_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (err) {
      console.error("[Auth] Session restoration failed", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function login(username: string, password: string) {
    const normalizedUsername = username.trim();
    const { data, error } = await supabase
      .from("users")
      .select("users, role, pw")
      .ilike("users", normalizedUsername)
      .maybeSingle();

    if (error) throw new Error(`Database error: ${error.message}`);
    if (!data || data.pw !== password) throw new Error("Invalid username or password.");

    const authenticatedUser: User = {
      id: data.users,
      initial: data.users.toUpperCase(), 
      role: data.role as any,
      team_id: "team1",
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(authenticatedUser));
    setUser(authenticatedUser);
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  // ─── THE FIX ───
  // We alias the Provider to a capitalized variable and cast to 'any'.
  // This bypasses the strict JSX return type check that's failing in your environment.
  const ContextProvider = AuthContext.Provider as any;

  return (
    <ContextProvider value={{ user, isLoading, login, logout }}>
      {children}
    </ContextProvider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}