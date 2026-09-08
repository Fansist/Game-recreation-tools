"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Zap } from "lucide-react";
import type { FlatTool } from "@/data/catalog-index";
import { CategoryIcon } from "./icons";
import { useRealTools } from "./useRealTools";

interface FeaturedToolProps {
  allTools: FlatTool[];
  onSelect: (tool: FlatTool) => void;
}

/**
 * Picks a deterministic "tool of the day" based on the current date.
 * Prefers tools with real SDK handlers so the featured tool is always
 * interactive via Try-It-Live.
 */
function pickToolOfTheDay(
  allTools: FlatTool[],
  realToolNames: Set<string>,
): FlatTool | null {
  if (allTools.length === 0) return null;
  const today = new Date();
  const dayIndex =
    today.getFullYear() * 1000 + (today.getMonth() + 1) * 50 + today.getDate();
  // Prefer REAL-handler tools for the featured spot.
  const pool = allTools.filter((t) => realToolNames.has(t.name));
  const source = pool.length > 0 ? pool : allTools;
  return source[dayIndex % source.length];
}

export function FeaturedTool({ allTools, onSelect }: FeaturedToolProps) {
  const { realTools } = useRealTools();
  const featured = useMemo(
    () => pickToolOfTheDay(allTools, realTools),
    [allTools, realTools],
  );

  if (!featured) return null;

  const isReal = realTools.has(featured.name);

  const handleOpen = () => {
    // Set the URL hash so the ToolBrowser's deep-link listener opens the tool.
    window.location.hash = `tool=${featured.name}`;
    // Also call onSelect as a fallback (in case the hash didn't change).
    onSelect(featured);
    // Scroll to the browser.
    document.getElementById("browser")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.4 }}
        >
          <Card
            onClick={handleOpen}
            className="group relative overflow-hidden cursor-pointer border-white/10 bg-card/40 backdrop-blur hover:bg-card/60 transition-all hover:border-white/20"
          >
            {/* Gradient glow background */}
            <div
              className={`absolute -top-20 -right-20 h-60 w-60 rounded-full bg-gradient-to-br ${featured.categoryAccent} opacity-20 blur-3xl group-hover:opacity-30 transition-opacity`}
            />
            <div
              className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${featured.categoryAccent}`}
            />

            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-start gap-6">
                {/* Left: icon + badge */}
                <div className="shrink-0 flex flex-col items-center gap-3">
                  <div
                    className={`inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br ${featured.categoryAccent} shadow-xl`}
                  >
                    <CategoryIcon
                      name={featured.categoryIcon}
                      className="h-8 w-8 text-white"
                    />
                  </div>
                  <Badge
                    variant="outline"
                    className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-300 rounded-full px-3 py-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    Tool of the day
                  </Badge>
                </div>

                {/* Right: content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs font-mono mb-2">
                    <span className="text-muted-foreground uppercase tracking-wider">
                      {featured.category}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                    <span className="text-fuchsia-400 truncate">
                      {featured.name}
                    </span>
                    {isReal && (
                      <span
                        title="This tool has a REAL SDK handler — Try-It-Live calls z-ai-web-dev-sdk"
                        className="inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shrink-0"
                      >
                        <Zap className="h-2.5 w-2.5" />
                        REAL SDK
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
                    {featured.title}
                  </h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed max-w-2xl">
                    {featured.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {featured.tags.slice(0, 6).map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[10px] bg-white/5 border-white/10 text-muted-foreground"
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpen();
                      }}
                      className="bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white hover:from-fuchsia-400 hover:to-cyan-400 shadow-md shadow-fuchsia-500/20"
                    >
                      Open & try it
                      <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </Button>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Returns: {featured.returns}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
