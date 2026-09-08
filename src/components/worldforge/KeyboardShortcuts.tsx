"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface ShortcutEntry {
  keys: string[];
  description: string;
  category: "navigation" | "filtering" | "actions";
}

const SHORTCUTS: ShortcutEntry[] = [
  { keys: ["/"], description: "Focus the tool search input", category: "navigation" },
  { keys: ["Cmd", "K"], description: "Open the command palette (fuzzy jump to any tool)", category: "navigation" },
  { keys: ["Esc"], description: "Close dialog / clear search / clear tag filter", category: "navigation" },
  { keys: ["R"], description: "Open a random tool from the current filter", category: "actions" },
  { keys: ["F"], description: "Toggle “Real only” filter (SDK-backed tools)", category: "filtering" },
  { keys: ["?"], description: "Show this keyboard shortcuts overlay", category: "navigation" },
];

const CATEGORY_LABELS: Record<ShortcutEntry["category"], string> = {
  navigation: "Navigation",
  filtering: "Filtering",
  actions: "Actions",
};

const CATEGORY_COLORS: Record<ShortcutEntry["category"], string> = {
  navigation: "border-cyan-500/30 bg-cyan-500/5 text-cyan-300",
  filtering: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
  actions: "border-fuchsia-500/30 bg-fuchsia-500/5 text-fuchsia-300",
};

/** Keyboard shortcuts help overlay — opened with the `?` key. */
export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      if (e.key === "?" && !inField) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const grouped = SHORTCUTS.reduce(
    (acc, s) => {
      (acc[s.category] ||= []).push(s);
      return acc;
    },
    {} as Record<string, ShortcutEntry[]>,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg bg-card/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-fuchsia-400" />
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>
            Press <kbd className="font-mono">?</kbd> anywhere to toggle this overlay.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {Object.entries(grouped).map(([cat, entries]) => (
            <div key={cat}>
              <div
                className={`text-[10px] font-mono uppercase tracking-wider mb-2 inline-block px-2 py-0.5 rounded border ${CATEGORY_COLORS[cat as ShortcutEntry["category"]]}`}
              >
                {CATEGORY_LABELS[cat as ShortcutEntry["category"]]}
              </div>
              <div className="space-y-1.5">
                {entries.map((s) => (
                  <div
                    key={s.description}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-sm text-muted-foreground">
                      {s.description}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {s.keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              +
                            </span>
                          )}
                          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/15 bg-white/5 text-foreground">
                            {k}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
