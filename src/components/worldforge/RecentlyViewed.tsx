"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { History, X } from "lucide-react";
import type { FlatTool } from "@/data/catalog-index";

interface RecentlyViewedProps {
  allTools: FlatTool[];
  onSelect: (tool: FlatTool) => void;
}

const STORAGE_KEY = "worldforge-recent-tools";

/** Loads the recently-viewed tool names from localStorage. */
function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function RecentlyViewed({ allTools, onSelect }: RecentlyViewedProps) {
  const [names, setNames] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);

  // Load on mount + when localStorage changes (e.g. from ToolDetail writes).
  useEffect(() => {
    const refresh = () => {
      setNames(loadRecent());
      setVisible(true);
    };
    refresh();
    window.addEventListener("storage", refresh);
    // Also refresh when the sheet opens/closes (ToolDetail writes on open).
    const interval = setInterval(refresh, 2000);
    return () => {
      window.removeEventListener("storage", refresh);
      clearInterval(interval);
    };
  }, []);

  const tools = names
    .map((n) => allTools.find((t) => t.name === n))
    .filter((t): t is FlatTool => !!t);

  if (!visible || tools.length === 0) return null;

  const clear = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setNames([]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-6 rounded-xl border border-white/10 bg-card/30 backdrop-blur p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" />
          Recently viewed
        </h3>
        <button
          onClick={clear}
          className="text-[10px] text-muted-foreground hover:text-rose-300 transition-colors inline-flex items-center gap-1"
        >
          <X className="h-3 w-3" />
          clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tools.map((t) => (
          <button
            key={t.name}
            onClick={() => onSelect(t)}
            className="group inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-colors"
            title={t.description}
          >
            <span className="text-[10px] font-mono text-muted-foreground uppercase">
              {t.category}
            </span>
            <span className="text-foreground group-hover:text-fuchsia-200 transition-colors">
              {t.title}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
