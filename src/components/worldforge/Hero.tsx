"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Boxes, Sparkles, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface HeroProps {
  toolCount: number;
  categoryCount: number;
  onBrowse: () => void;
  onInstall: () => void;
}

export function Hero({ toolCount, categoryCount, onBrowse, onInstall }: HeroProps) {
  return (
    <section className="relative overflow-hidden pt-16 pb-24">
      {/* Background grid + glow */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
        <div className="absolute left-1/2 top-[-200px] h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-fuchsia-600/20 blur-[140px]" />
        <div className="absolute right-[10%] top-[40%] h-[400px] w-[400px] rounded-full bg-cyan-500/20 blur-[140px]" />
        <div className="absolute left-[5%] bottom-[-200px] h-[400px] w-[600px] rounded-full bg-violet-600/20 blur-[140px]" />
      </div>

      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge
              variant="outline"
              className="mb-6 gap-2 rounded-full border-fuchsia-500/40 bg-fuchsia-500/10 px-4 py-1.5 text-fuchsia-300 backdrop-blur"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Model Context Protocol · Claude Code · Claude Desktop
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight bg-gradient-to-br from-white via-fuchsia-100 to-cyan-200 bg-clip-text text-transparent"
          >
            Build 3D Worlds at
            <br />
            the Speed of Thought
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl"
          >
            <span className="text-foreground font-semibold">WorldForge</span> is an MCP
            server that ships{" "}
            <span className="text-fuchsia-400 font-semibold">
              {toolCount}+ tools
            </span>{" "}
            for crafting open-world sandbox and story games like GTA6 — characters,
            vehicles, buildings, physics, AI, narrative, audio, and everything
            else. Plug it into Claude and start building.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center gap-4"
          >
            <Button
              size="lg"
              onClick={onBrowse}
              className="group bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white hover:from-fuchsia-400 hover:to-cyan-400 shadow-lg shadow-fuchsia-500/20 rounded-full px-8 h-12 text-base"
            >
              <Boxes className="mr-2 h-5 w-5" />
              Browse {toolCount} Tools
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onInstall}
              className="rounded-full px-8 h-12 text-base border-white/20 bg-white/5 backdrop-blur hover:bg-white/10"
            >
              <Zap className="mr-2 h-5 w-5 text-cyan-400" />
              Install for Claude
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 w-full max-w-3xl"
          >
            <Stat value={`${toolCount}+`} label="MCP Tools" />
            <Stat value={`${categoryCount}`} label="Categories" />
            <Stat value="2" label="Claude Apps" />
            <Stat value="0" label="Setup Cost" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-white to-muted-foreground bg-clip-text text-transparent">
        {value}
      </div>
      <div className="text-xs md:text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
