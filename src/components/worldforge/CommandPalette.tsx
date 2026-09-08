"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search, CornerDownLeft, ArrowUp, ArrowDown, Star, Zap } from "lucide-react";
import type { FlatTool } from "@/data/catalog-index";
import { CategoryIcon } from "./icons";

interface CommandPaletteProps {
  allTools: FlatTool[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (tool: FlatTool) => void;
  favoriteNames: string[];
  realToolNames: Set<string>;
}

/**
 * A Cmd+K command palette for jumping to any tool by name.
 * Shows up to 8 matches ranked by: exact-prefix > substring > tag match.
 */
export function CommandPalette({
  allTools,
  open,
  onOpenChange,
  onSelect,
  favoriteNames,
  realToolNames,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset query + focus input when opened.
  useEffect(() => {
    const reset = () => {
      setQuery("");
      setActiveIdx(0);
      inputRef.current?.focus();
    };
    if (open) {
      const id = setTimeout(reset, 50);
      return () => clearTimeout(id);
    }
  }, [open]);

  // Filter + rank matches.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // No query → show REAL-handler tools first, then favorites.
      const real = allTools.filter((t) => realToolNames.has(t.name));
      const favs = allTools.filter(
        (t) => favoriteNames.includes(t.name) && !realToolNames.has(t.name),
      );
      return [...real, ...favs].slice(0, 8);
    }
    const scored: Array<{ tool: FlatTool; score: number }> = [];
    for (const t of allTools) {
      const nameLower = t.name.toLowerCase();
      const titleLower = t.title.toLowerCase();
      let score = 0;
      if (nameLower.startsWith(q)) score = 100;
      else if (titleLower.startsWith(q)) score = 90;
      else if (nameLower.includes(q)) score = 70;
      else if (titleLower.includes(q)) score = 60;
      else if (t.tags.some((tag) => tag.toLowerCase().includes(q))) score = 40;
      else if (t.description.toLowerCase().includes(q)) score = 30;
      if (score > 0) {
        if (realToolNames.has(t.name)) score += 5;
        if (favoriteNames.includes(t.name)) score += 3;
        scored.push({ tool: t, score });
      }
    }
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((s) => s.tool);
  }, [query, allTools, favoriteNames, realToolNames]);

  // Clamp activeIdx if it's out of range for the current matches.
  // (Avoids the setState-in-effect lint error while keeping selection valid.)
  const safeActiveIdx = Math.min(activeIdx, Math.max(0, matches.length - 1));

  // Keyboard nav inside the palette.
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (matches[safeActiveIdx]) {
        onSelect(matches[safeActiveIdx]);
        onOpenChange(false);
      }
    }
  };

  // Scroll active item into view.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-cp-idx="${safeActiveIdx}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [safeActiveIdx]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 bg-card/95 backdrop-blur-xl border-white/10">
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
          <DialogDescription>Search and jump to any tool.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3 px-4 h-12 border-b border-white/10">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Jump to tool — e.g. 'hero', 'gunshot', 'mountain'..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-muted-foreground">
            esc
          </kbd>
        </div>
        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
          {matches.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No tools match "{query}"
            </div>
          ) : (
            matches.map((t, idx) => {
              const isFav = favoriteNames.includes(t.name);
              const isReal = realToolNames.has(t.name);
              const active = idx === safeActiveIdx;
              return (
                <button
                  key={t.name}
                  data-cp-idx={idx}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => {
                    onSelect(t);
                    onOpenChange(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                    active
                      ? "bg-fuchsia-500/15 border-l-2 border-fuchsia-400"
                      : "border-l-2 border-transparent hover:bg-white/5"
                  }`}
                >
                  <div
                    className={`shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br ${t.categoryAccent} shadow`}
                  >
                    <CategoryIcon
                      name={t.categoryIcon}
                      className="h-4 w-4 text-white"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {t.title}
                      </span>
                      {isReal && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shrink-0">
                          <Zap className="h-2.5 w-2.5" />
                          REAL
                        </span>
                      )}
                      {isFav && (
                        <Star className="h-3 w-3 fill-amber-300 text-amber-300 shrink-0" />
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground truncate">
                      {t.category} · {t.name}
                    </div>
                  </div>
                  {active && (
                    <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
        <div className="border-t border-white/10 px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <ArrowUp className="h-3 w-3" />
              <ArrowDown className="h-3 w-3" />
              navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" />
              open
            </span>
          </div>
          <span className="font-mono">
            {matches.length} match{matches.length === 1 ? "" : "es"}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
