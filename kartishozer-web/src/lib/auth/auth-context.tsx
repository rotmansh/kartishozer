"use client";

// ============================================================
// Preview auth provider.
//
// Clerk is the planned production auth provider (see admin panel,
// which already gates /admin on Clerk session claims). Real Clerk
// keys aren't available in this environment, so this context mimics
// the same shape (`isSignedIn`, `user`, `signOut`) with data kept in
// localStorage, purely so every screen can be previewed signed-in or
// signed-out. Swapping this out for @clerk/nextjs's <ClerkProvider>
// and useUser()/useAuth() hooks later should not require touching
// the pages that consume useAuth().
// ============================================================

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type PreviewUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  isSellerVerified: boolean;
};

type AuthState = {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: PreviewUser | null;
  signIn: (input: { fullName: string; email: string }) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = "kartishozer.preview.user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PreviewUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore malformed/blocked storage
    }
    setIsLoaded(true);
  }, []);

  function signIn(input: { fullName: string; email: string }) {
    const newUser: PreviewUser = {
      id: "preview-user",
      fullName: input.fullName,
      email: input.email,
      phone: "050-0000000",
      isSellerVerified: false,
    };
    setUser(newUser);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    } catch {
      // ignore
    }
  }

  function signOut() {
    setUser(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return (
    <AuthContext.Provider
      value={{ isLoaded, isSignedIn: !!user, user, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
