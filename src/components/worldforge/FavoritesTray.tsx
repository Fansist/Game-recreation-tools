"use client";

import { motion } from "framer-motion";
import { Star, X, Download } from "lucide-react";
import { toast } from "sonner";
import type { FlatTool } from "@/data/catalog-index";

interface FavoritesTrayProps {
  favoriteTools: FlatTool[];
  onSelect: (tool: FlatTool) => void;
  onRemove: (toolName: string) => void;
  onClear: () => void;
}

/** Triggers a JSON download of the favorite tools list. */
function exportFavorites(tools: FlatTool[]) {
  const data = {
    exportedAt: new Date().toISOString(),
    count: tools.length,
    favorites: tools.map((t) => ({
      name: t.name,
      title: t.title,
      category: t.category,
      categoryName: t.categoryName,
      description: t.description,
      tags: t.tags,
      returns: t.returns,
    })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `worldforge-favorites-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success(`Exported ${tools.length} favorite tool${tools.length === 1 ? "" : "s"}`);
}

/** Tray showing starred/favorited tools (persisted in localStorage). */
export function FavoritesTray({
  favoriteTools,
  onSelect,
  onRemove,
  onClear,
}: FavoritesTrayProps) {
  if (favoriteTools.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 backdrop-blur p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-300 inline-flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5 fill-amber-300" />
          Favorites
          <span className="text-muted-foreground font-normal ml-1">
            ({favoriteTools.length})
          </span>
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportFavorites(favoriteTools)}
            className="text-[10px] text-amber-300/80 hover:text-amber-200 transition-colors inline-flex items-center gap-1"
            title="Download favorites as JSON"
          >
            <Download className="h-3 w-3" />
            export
          </button>
          <button
            onClick={onClear}
            className="text-[10px] text-muted-foreground hover:text-rose-300 transition-colors inline-flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            clear all
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {favoriteTools.map((t) => (
          <div
            key={t.name}
            className="group inline-flex items-center gap-1.5 text-xs pl-2.5 pr-1.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
          >
            <button
              onClick={() => onSelect(t)}
              className="inline-flex items-center gap-1.5"
              title={t.description}
            >
              <span className="text-[10px] font-mono text-amber-300/70 uppercase">
                {t.category}
              </span>
              <span className="text-amber-50 group-hover:text-amber-100 transition-colors">
                {t.title}
              </span>
            </button>
            <button
              onClick={() => onRemove(t.name)}
              className="text-amber-300/60 hover:text-rose-300 transition-colors rounded-full p-0.5 hover:bg-white/10"
              title="Remove from favorites"
              aria-label={`Remove ${t.title} from favorites`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
