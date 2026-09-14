"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type FavoritesState = {
  isLoaded: boolean;
  ids: string[];
  isFavorite: (listingId: string) => boolean;
  toggle: (listingId: string) => void;
};

const FavoritesContext = createContext<FavoritesState | null>(null);

const STORAGE_KEY = "kartishozer.preview.favorites";

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setIds(JSON.parse(raw));
    } catch {
      // ignore
    }
    setIsLoaded(true);
  }, []);

  function persist(next: string[]) {
    setIds(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function toggle(listingId: string) {
    persist(
      ids.includes(listingId) ? ids.filter((id) => id !== listingId) : [...ids, listingId]
    );
  }

  return (
    <FavoritesContext.Provider
      value={{ isLoaded, ids, isFavorite: (id) => ids.includes(id), toggle }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesState {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
