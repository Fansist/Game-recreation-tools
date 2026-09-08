"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";
import type { CategoryDef } from "@/data/tool-catalog";
import { CategoryIcon } from "./icons";

interface CategoriesGridProps {
  categories: CategoryDef[];
  onSelectCategory: (id: string) => void;
}

export function CategoriesGrid({ categories, onSelectCategory }: CategoriesGridProps) {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-start mb-10">
          <Badge
            variant="outline"
            className="mb-3 gap-2 border-cyan-500/40 bg-cyan-500/10 text-cyan-300 rounded-full px-3 py-1"
          >
            <span className="text-xs font-mono">{categories.length} categories</span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Every layer of a 3D world, ready to summon
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            From the first character to the last cutscene, WorldForge covers all{" "}
            {categories.length} layers of building an open-world game. Click any
            category to dive into its toolset.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat, idx) => {
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.3, delay: Math.min(idx * 0.015, 0.4) }}
              >
                <Card
                  onClick={() => onSelectCategory(cat.id)}
                  className="group relative overflow-hidden cursor-pointer border-white/10 bg-card/40 backdrop-blur hover:bg-card/60 transition-all hover:scale-[1.02] hover:border-white/20"
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${cat.accent}`}
                  />
                  <div
                    className={`absolute -top-10 -right-10 h-24 w-24 rounded-full bg-gradient-to-br ${cat.accent} opacity-20 blur-2xl transition-opacity group-hover:opacity-40`}
                  />
                  <div className="p-5">
                    <div
                      className={`inline-flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br ${cat.accent} shadow-lg`}
                    >
                      <CategoryIcon name={cat.icon} className="h-6 w-6 text-white" />
                    </div>
                    <div className="mt-4 flex items-start justify-between">
                      <h3 className="text-base font-semibold leading-tight pr-2">
                        {cat.name}
                      </h3>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {cat.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <Badge
                        variant="secondary"
                        className="bg-white/5 text-foreground border-white/10 text-[10px] font-mono"
                      >
                        {cat.tools.length} tools
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                        {cat.id}
                      </span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
