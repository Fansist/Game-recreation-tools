"use client";

import { useCallback, useEffect, useState } from "react";
import type { FlatTool } from "@/data/catalog-index";

const FAVORITES_KEY = "worldforge-favorites";

/** Loads favorite tool names from localStorage. */
function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Persists favorite tool names to localStorage. */
function saveFavorites(names: string[]): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(names.slice(0, 50)));
  } catch {
    // localStorage may be unavailable — ignore.
  }
}

/**
 * Hook for managing favorite tools (persisted in localStorage).
 * Used by the favorites tray in the ToolBrowser and the star button in ToolDetail.
 */
export function useFavorites(allTools: FlatTool[]) {
  const [favoriteNames, setFavoriteNames] = useState<string[]>([]);

  useEffect(() => {
    const refresh = () => setFavoriteNames(loadFavorites());
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  const isFavorite = useCallback(
    (toolName: string) => favoriteNames.includes(toolName),
    [favoriteNames],
  );

  const toggleFavorite = useCallback((toolName: string) => {
    setFavoriteNames((prev) => {
      const next = prev.includes(toolName)
        ? prev.filter((n) => n !== toolName)
        : [toolName, ...prev].slice(0, 50);
      saveFavorites(next);
      return next;
    });
  }, []);

  const favoriteTools = favoriteNames
    .map((n) => allTools.find((t) => t.name === n))
    .filter((t): t is FlatTool => !!t);

  return { favoriteNames, favoriteTools, isFavorite, toggleFavorite };
}
