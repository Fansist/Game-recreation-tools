"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Boxes,
  Layers,
  Tags,
  Activity,
  Server,
  TrendingUp,
  Cpu,
} from "lucide-react";
import { allCategories, allTools, totalToolCount, totalCategoryCount } from "@/data/catalog-index";
import { useMcpStatus } from "./useMcpStatus";

/** Computes the top 6 categories by tool count for the "Top categories" tile. */
function topCategories() {
  return [...allCategories]
    .sort((a, b) => b.tools.length - a.tools.length)
    .slice(0, 6);
}

/** Total input parameters across all tools. */
function totalInputs() {
  return allTools.reduce((sum, t) => sum + t.inputs.length, 0);
}

/** Total unique tags across all tools. */
function totalUniqueTags() {
  const set = new Set<string>();
  for (const t of allTools) for (const tag of t.tags) set.add(tag);
  return set.size;
}

/** Average tools per category. */
function avgToolsPerCategory() {
  return Math.round(totalToolCount / totalCategoryCount);
}

export function StatsDashboard() {
  const status = useMcpStatus();
  const top = topCategories();

  const stats = [
    {
      label: "MCP Tools",
      value: totalToolCount.toLocaleString(),
      icon: Boxes,
      accent: "from-fuchsia-500 to-pink-500",
      hint: "all callable from Claude",
    },
    {
      label: "Categories",
      value: totalCategoryCount.toString(),
      icon: Layers,
      accent: "from-cyan-500 to-blue-500",
      hint: "every category has ≥25 tools",
    },
    {
      label: "Input parameters",
      value: totalInputs().toLocaleString(),
      icon: Tags,
      accent: "from-emerald-500 to-teal-500",
      hint: "typed & validated",
    },
    {
      label: "Searchable tags",
      value: totalUniqueTags().toLocaleString(),
      icon: Activity,
      accent: "from-amber-500 to-orange-500",
      hint: "filter the catalog",
    },
    {
      label: "Avg tools / cat",
      value: avgToolsPerCategory().toString(),
      icon: TrendingUp,
      accent: "from-violet-500 to-purple-500",
      hint: "across 56 categories",
    },
    {
      label: "MCP server",
      value: status.loading
        ? "…"
        : status.online
          ? "ONLINE"
          : "OFFLINE",
      icon: Server,
      accent: status.loading
        ? "from-slate-500 to-slate-700"
        : status.online
          ? "from-emerald-500 to-green-500"
          : "from-rose-500 to-red-500",
      hint: status.loading
        ? "checking localhost:3030"
        : status.online
          ? `${status.toolCount} tools live`
          : "see install guide",
    },
  ];

  return (
    <section className="py-12 border-y border-white/5 bg-gradient-to-b from-background/50 to-transparent">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-start mb-6">
          <Badge
            variant="outline"
            className="mb-3 gap-2 border-emerald-500/40 bg-emerald-500/10 text-emerald-300 rounded-full px-3 py-1"
          >
            <Cpu className="h-3 w-3" />
            <span className="text-xs font-mono">live stats</span>
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            One server. {totalToolCount.toLocaleString()} tools. Zero friction.
          </h2>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((s, idx) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
              >
                <Card className="relative overflow-hidden border-white/10 bg-card/40 backdrop-blur p-4 h-full">
                  <div
                    className={`absolute -top-8 -right-8 h-16 w-16 rounded-full bg-gradient-to-br ${s.accent} opacity-20 blur-2xl`}
                  />
                  <div
                    className={`inline-flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br ${s.accent} shadow`}
                  >
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="mt-3 text-2xl md:text-3xl font-bold tracking-tight">
                    {s.value}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mt-0.5">
                    {s.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 mt-1 leading-tight">
                    {s.hint}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Top categories strip */}
        <div className="mt-6 rounded-xl border border-white/10 bg-card/30 backdrop-blur p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Top categories by tool count
            </h3>
            <span className="text-[10px] font-mono text-muted-foreground">
              {totalToolCount.toLocaleString()} total
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {top.map((cat) => (
              <div
                key={cat.id}
                className="rounded-lg border border-white/10 bg-background/40 px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium truncate pr-2">
                    {cat.short || cat.name}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded bg-gradient-to-r ${cat.accent} text-white`}
                  >
                    {cat.tools.length}
                  </span>
                </div>
                <div className="mt-1.5 h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${cat.accent}`}
                    style={{
                      width: `${Math.min(
                        100,
                        (cat.tools.length / top[0].tools.length) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
