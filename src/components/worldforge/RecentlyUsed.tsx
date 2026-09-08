"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { History, X, Play } from "lucide-react";
import type { FlatTool } from "@/data/catalog-index";

interface RecentlyUsedProps {
  allTools: FlatTool[];
  onSelect: (tool: FlatTool) => void;
}

const STORAGE_KEY = "worldforge-used-tools";

/** Loads the recently-used tool names from localStorage. */
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

/**
 * Tray showing tools that were actually RUN via Try-It-Live (not just viewed).
 * Reads from `worldforge-used-tools` localStorage, written by ToolDetail's
 * `trackUsed()` function after every successful tool execution.
 */
export function RecentlyUsed({ allTools, onSelect }: RecentlyUsedProps) {
  const [names, setNames] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setNames(loadRecent());
      setVisible(true);
    };
    refresh();
    // Poll every 2s — the ToolDetail writes to localStorage on tool runs,
    // and we want the tray to update without a page reload.
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
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
      className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/5 backdrop-blur p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-300 inline-flex items-center gap-1.5">
          <Play className="h-3.5 w-3.5 fill-violet-300" />
          Recently run
          <span className="text-muted-foreground font-normal ml-1">
            ({tools.length})
          </span>
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
        {tools.map((t, idx) => (
          <button
            key={t.name}
            onClick={() => onSelect(t)}
            className="group inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 transition-colors"
            title={`${t.description} (run ${idx + 1} tool${idx === 0 ? "" : "s"} ago)`}
          >
            <span className="text-[10px] font-mono text-violet-300/70 uppercase">
              {t.category}
            </span>
            <span className="text-violet-50 group-hover:text-violet-100 transition-colors">
              {t.title}
            </span>
            {idx === 0 && (
              <span className="text-[9px] font-mono text-violet-400/60 ml-0.5">
                · last
              </span>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
