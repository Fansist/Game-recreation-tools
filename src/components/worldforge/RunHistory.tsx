"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { History, X, Zap, Clock, Download } from "lucide-react";
import { toast } from "sonner";

interface RunHistoryEntry {
  toolName: string;
  title: string;
  result: string;
  isReal: boolean;
  timestamp: number;
}

interface RunHistoryProps {
  onSelectTool?: (toolName: string) => void;
}

const STORAGE_KEY = "worldforge-run-history";

function loadHistory(): RunHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.slice(0, 10) : [];
  } catch {
    return [];
  }
}

/** Triggers a JSON download of the run history. */
function exportHistory(entries: RunHistoryEntry[]) {
  const data = {
    exportedAt: new Date().toISOString(),
    count: entries.length,
    runs: entries.map((e) => ({
      toolName: e.toolName,
      title: e.title,
      isReal: e.isReal,
      timestamp: new Date(e.timestamp).toISOString(),
      result: e.result,
    })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `worldforge-run-history-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success(`Exported ${entries.length} run${entries.length === 1 ? "" : "s"}`);
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

/** Tray showing recent Try-It-Live run results (persisted in localStorage). */
export function RunHistory({ onSelectTool }: RunHistoryProps) {
  const [entries, setEntries] = useState<RunHistoryEntry[]>([]);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const refresh = () => {
      setEntries(loadHistory());
      setVisible(true);
    };
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, []);

  const clear = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setEntries([]);
  };

  if (!visible || entries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-4 rounded-xl border border-teal-500/20 bg-teal-500/5 backdrop-blur p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-300 inline-flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" />
          Run history
          <span className="text-muted-foreground font-normal ml-1">
            ({entries.length})
          </span>
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportHistory(entries)}
            className="text-[10px] text-teal-300/80 hover:text-teal-200 transition-colors inline-flex items-center gap-1"
            title="Download run history as JSON"
          >
            <Download className="h-3 w-3" />
            export
          </button>
          <button
            onClick={clear}
            className="text-[10px] text-muted-foreground hover:text-rose-300 transition-colors inline-flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            clear
          </button>
        </div>
      </div>
      <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
        {entries.map((entry, idx) => (
          <div
            key={`${entry.toolName}-${entry.timestamp}`}
            className="rounded-lg border border-white/10 bg-background/40 overflow-hidden"
          >
            <button
              onClick={() => setExpanded(expanded === idx ? null : idx)}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-white/5 transition-colors"
            >
              {entry.isReal ? (
                <Zap className="h-3 w-3 text-emerald-400 fill-emerald-400 shrink-0" />
              ) : (
                <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
              <span className="text-xs font-medium truncate flex-1">
                {entry.title}
              </span>
              <span className="text-[9px] font-mono text-muted-foreground shrink-0">
                {formatTimeAgo(entry.timestamp)}
              </span>
              {onSelectTool && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTool(entry.toolName);
                  }}
                  className="text-[9px] text-cyan-400 hover:text-cyan-300 shrink-0 px-1"
                >
                  reopen
                </span>
              )}
            </button>
            {expanded === idx && (
              <div className="px-3 pb-2 pt-1 border-t border-white/5">
                <pre className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap break-words leading-relaxed max-h-[150px] overflow-y-auto">
                  {entry.result}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
