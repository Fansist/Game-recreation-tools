"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  X,
  Filter,
  ChevronRight,
  Shuffle,
  Sparkles,
  Tags,
  Zap,
  Star,
  Command,
} from "lucide-react";
import type { CategoryDef, FlatTool } from "@/data/catalog-index";
import { CategoryIcon } from "./icons";
import { ToolDetail } from "./ToolDetail";
import { useRealTools } from "./useRealTools";
import { RecentlyViewed } from "./RecentlyViewed";
import { RecentlyUsed } from "./RecentlyUsed";
import { RunHistory } from "./RunHistory";
import { FavoritesTray } from "./FavoritesTray";
import { useFavorites } from "./useFavorites";
import { CommandPalette } from "./CommandPalette";

interface ToolBrowserProps {
  categories: CategoryDef[];
  tools: FlatTool[];
  activeCategory: string | null;
  onClearCategory: () => void;
  onSelectCategory: (id: string) => void;
}

/** Compute the top N most-common tags across all tools. */
function topTags(tools: FlatTool[], n: number): string[] {
  const counts = new Map<string, number>();
  for (const t of tools) for (const tag of t.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([tag]) => tag);
}

export function ToolBrowser({
  categories,
  tools,
  activeCategory,
  onClearCategory,
  onSelectCategory,
}: ToolBrowserProps) {
  const [query, setQuery] = useState("");
  const [selectedTool, setSelectedTool] = useState<FlatTool | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [realOnly, setRealOnly] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { realTools } = useRealTools();
  const { favoriteTools, favoriteNames, isFavorite, toggleFavorite } = useFavorites(tools);

  // Deep-link support: read URL hash on mount + hashchange.
  // Supports: #category=vehicles, #tag=physics, #tool=characters_generate_hero
  useEffect(() => {
    const apply = () => {
      const h = window.location.hash;
      const cm = h.match(/category=([a-z_]+)/);
      if (cm) onSelectCategory(cm[1]);
      const tm = h.match(/tag=([a-z0-9_]+)/);
      if (tm) setActiveTag(tm[1]);
      else setActiveTag(null);
      const toolm = h.match(/tool=([a-z0-9_]+)/);
      if (toolm) {
        const t = tools.find((tt) => tt.name === toolm[1]);
        if (t) setSelectedTool(t);
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [tools, onSelectCategory]);

  // Update URL hash when category changes (for shareable deep links).
  useEffect(() => {
    const current = window.location.hash;
    const newHash = activeCategory ? `#category=${activeCategory}` : "";
    // Preserve tool= or tag= if present.
    const toolMatch = current.match(/(tool=[a-z0-9_]+)/);
    const tagMatch = current.match(/(tag=[a-z0-9_]+)/);
    const extras = [toolMatch?.[1], tagMatch?.[1]].filter(Boolean).join("&");
    const final = extras
      ? activeCategory
        ? `#category=${activeCategory}&${extras}`
        : `#${extras}`
      : newHash;
    if (final !== current) {
      window.history.replaceState(null, "", final || window.location.pathname);
    }
  }, [activeCategory]);

  const baseForTags = useMemo(
    () => (activeCategory ? tools.filter((t) => t.category === activeCategory) : tools),
    [tools, activeCategory],
  );
  const topTagList = useMemo(() => topTags(baseForTags, 16), [baseForTags]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools.filter((t) => {
      if (activeCategory && t.category !== activeCategory) return false;
      if (activeTag && !t.tags.includes(activeTag)) return false;
      if (realOnly && !realTools.has(t.name)) return false;
      if (!q) return true;
      const haystack = `${t.name} ${t.title} ${t.description} ${t.tags.join(" ")} ${t.categoryName}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [tools, query, activeCategory, activeTag, realOnly, realTools]);

  const activeCat = activeCategory
    ? categories.find((c) => c.id === activeCategory)
    : null;

  const pickRandomTool = useCallback(() => {
    if (filtered.length === 0) return;
    const t = filtered[Math.floor(Math.random() * filtered.length)];
    setSelectedTool(t);
  }, [filtered]);

  // Keyboard shortcuts: "/" focuses search, "r" picks random, "Esc" closes, Cmd+K opens palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      // Cmd+K / Ctrl+K opens command palette (works even in fields).
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (e.key === "Escape") {
        if (paletteOpen) {
          setPaletteOpen(false);
          return;
        }
        if (selectedTool) {
          setSelectedTool(null);
        } else if (query) {
          setQuery("");
        } else if (activeTag) {
          setActiveTag(null);
        }
        return;
      }
      if (inField) return;
      if (e.key === "/") {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>(
          'input[placeholder*="Search tools"]',
        );
        input?.focus();
      } else if (e.key.toLowerCase() === "r" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        pickRandomTool();
      } else if (e.key.toLowerCase() === "f" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setRealOnly((r) => !r);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, selectedTool, query, activeTag, paletteOpen, pickRandomTool]);

  const hasAnyFilter = !!(activeCat || query || activeTag || realOnly);

  return (
    <section id="browser" className="py-16 bg-gradient-to-b from-background via-background/50 to-background">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-start mb-8">
          <Badge
            variant="outline"
            className="mb-3 gap-2 border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300 rounded-full px-3 py-1"
          >
            <span className="text-xs font-mono">tool catalog</span>
          </Badge>
          <div className="flex items-start justify-between w-full gap-4">
            <div className="flex-1">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Browse the {tools.length.toLocaleString()}-tool catalog
              </h2>
              <p className="mt-3 text-muted-foreground max-w-2xl">
                Search across every WorldForge tool. Each tool is fully
                compatible with Claude Code and Claude Desktop — copy the
                config to start building.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={() => setPaletteOpen(true)}
                variant="outline"
                className="rounded-full border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 hover:text-cyan-100"
                title="Open command palette (Cmd+K)"
              >
                <Command className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Cmd+K</span>
              </Button>
              <Button
                onClick={pickRandomTool}
                disabled={filtered.length === 0}
                variant="outline"
                className="rounded-full border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/20 hover:text-fuchsia-100"
                title="Surprise me — open a random tool from the current filter (R)"
              >
                <Shuffle className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Random tool</span>
                <span className="sm:hidden">Random</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Search bar + Real-only toggle */}
        <div className="flex flex-col sm:flex-row gap-3 max-w-3xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tools — e.g. 'hero', 'gunshot', 'pathfinding'..."
              className="h-12 pl-11 pr-12 bg-card/60 backdrop-blur border-white/10 rounded-full text-base"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setRealOnly((r) => !r)}
            className={`shrink-0 inline-flex items-center gap-1.5 h-12 px-4 rounded-full border text-xs font-mono uppercase tracking-wider transition-colors ${
              realOnly
                ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-200"
                : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            }`}
            title="Show only tools with real z-ai-web-dev-sdk handlers (F)"
          >
            <Zap className={`h-3.5 w-3.5 ${realOnly ? "fill-emerald-300" : ""}`} />
            Real only
            {realOnly && (
              <span className="ml-1 text-[10px] normal-case">
                · {realTools.size}
              </span>
            )}
          </button>
        </div>

        {/* Favorites tray (starred tools, persisted in localStorage) */}
        <FavoritesTray
          favoriteTools={favoriteTools}
          onSelect={setSelectedTool}
          onRemove={(name) => toggleFavorite(name)}
          onClear={() => favoriteNames.forEach((n) => toggleFavorite(n))}
        />

        {/* Recently-viewed tray (localStorage) */}
        <RecentlyViewed allTools={tools} onSelect={setSelectedTool} />

        {/* Recently-run tray (tools actually executed via Try-It-Live) */}
        <RecentlyUsed allTools={tools} onSelect={setSelectedTool} />

        {/* Run history (past Try-It-Live results with expandable details) */}
        <RunHistory onSelectTool={(name) => {
          const t = tools.find((tt) => tt.name === name);
          if (t) setSelectedTool(t);
        }} />

        {/* Tag-filter chips */}
        {topTagList.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 max-w-4xl">
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1 mr-1">
              <Tags className="h-3 w-3" /> Tags:
            </span>
            {topTagList.map((tag) => {
              const active = activeTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setActiveTag(active ? null : tag)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-colors ${
                    active
                      ? "border-fuchsia-400 bg-fuchsia-500/30 text-fuchsia-100"
                      : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
            {activeTag && (
              <button
                onClick={() => setActiveTag(null)}
                className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-colors"
              >
                clear tag
              </button>
            )}
          </div>
        )}

        {/* Active filters row */}
        {hasAnyFilter && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Filter className="h-3 w-3" /> Filters:
            </span>
            {activeCat && (
              <Badge
                variant="secondary"
                className="gap-1.5 bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30 rounded-full pl-3 pr-2 py-1"
              >
                {activeCat.name}
                <button
                  onClick={onClearCategory}
                  className="hover:bg-fuchsia-500/20 rounded-full p-0.5"
                  aria-label="Remove filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {realOnly && (
              <Badge
                variant="secondary"
                className="gap-1.5 bg-emerald-500/15 text-emerald-300 border-emerald-500/30 rounded-full pl-3 pr-2 py-1"
              >
                <Zap className="h-3 w-3 fill-emerald-300" />
                Real only
                <button
                  onClick={() => setRealOnly(false)}
                  className="hover:bg-emerald-500/20 rounded-full p-0.5"
                  aria-label="Disable real-only filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {activeTag && (
              <Badge
                variant="secondary"
                className="gap-1.5 bg-emerald-500/15 text-emerald-300 border-emerald-500/30 rounded-full pl-3 pr-2 py-1"
              >
                #{activeTag}
                <button
                  onClick={() => setActiveTag(null)}
                  className="hover:bg-emerald-500/20 rounded-full p-0.5"
                  aria-label="Remove tag filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {query && (
              <Badge
                variant="secondary"
                className="gap-1.5 bg-cyan-500/15 text-cyan-300 border-cyan-500/30 rounded-full pl-3 pr-2 py-1"
              >
                "{query}"
                <button
                  onClick={() => setQuery("")}
                  className="hover:bg-cyan-500/20 rounded-full p-0.5"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-1">
              · {filtered.length} tool{filtered.length === 1 ? "" : "s"}
            </span>
          </div>
        )}

        {/* Tool grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No tools match your search.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 rounded-full"
              onClick={() => {
                setQuery("");
                setActiveTag(null);
                onClearCategory();
              }}
            >
              Reset filters
            </Button>
          </div>
        ) : (
          <ScrollArea className="mt-8 h-[600px] rounded-2xl border border-white/10 bg-card/20 backdrop-blur">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
              {filtered.map((tool, idx) => (
                <motion.div
                  key={tool.name}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.005, 0.15) }}
                  className="group relative text-left p-4 rounded-xl border border-white/10 bg-card/40 backdrop-blur hover:bg-card/70 hover:border-white/20 transition-all"
                >
                  <button
                    onClick={() => setSelectedTool(tool)}
                    className="w-full text-left"
                    aria-label={`Open ${tool.title}`}
                  >
                  <div className="flex items-start gap-3">
                    <div
                      className={`shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br ${tool.categoryAccent} shadow`}
                    >
                      <CategoryIcon name={tool.categoryIcon} className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                          {tool.category}
                        </span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                        <span className="text-[10px] font-mono text-fuchsia-400 truncate">
                          {tool.name}
                        </span>
                        {realTools.has(tool.name) && (
                          <span
                            title="This tool has a REAL SDK handler — Try-It-Live calls z-ai-web-dev-sdk"
                            className="inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shrink-0"
                          >
                            <Zap className="h-2.5 w-2.5" />
                            REAL
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1 text-sm font-semibold leading-tight group-hover:text-fuchsia-200 transition-colors line-clamp-2">
                        {tool.title}
                      </h3>
                      <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {tool.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tool.tags.slice(0, 3).map((tag) => (
                          <code
                            key={tag}
                            className="text-[9px] px-1 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground/80"
                          >
                            #{tag}
                          </code>
                        ))}
                      </div>
                    </div>
                  </div>
                  </button>
                  {/* Favorite star button (top-right corner of card) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(tool.name);
                    }}
                    className={`absolute top-2 right-2 p-1 rounded-full transition-all ${
                      isFavorite(tool.name)
                        ? "text-amber-300 opacity-100"
                        : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-amber-300"
                    }`}
                    title={isFavorite(tool.name) ? "Remove from favorites" : "Add to favorites"}
                    aria-label={isFavorite(tool.name) ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Star
                      className={`h-4 w-4 ${
                        isFavorite(tool.name) ? "fill-amber-300" : ""
                      }`}
                    />
                  </button>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Detail drawer */}
      <ToolDetail
        tool={selectedTool}
        onClose={() => setSelectedTool(null)}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
      />

      {/* Command palette (Cmd+K) */}
      <CommandPalette
        allTools={tools}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onSelect={setSelectedTool}
        favoriteNames={favoriteNames}
        realToolNames={realTools}
      />
    </section>
  );
}
