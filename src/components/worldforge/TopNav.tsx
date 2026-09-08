"use client";

import { Boxes, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMcpStatus } from "./useMcpStatus";

interface TopNavProps {
  toolCount: number;
  onBrowse: () => void;
  onInstall: () => void;
}

export function TopNav({ toolCount, onBrowse, onInstall }: TopNavProps) {
  const status = useMcpStatus();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center shadow-md">
            <Boxes className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-base sm:text-lg">WorldForge</span>
          <span className="hidden sm:inline-block ml-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-white/10 rounded px-1.5 py-0.5">
            v1.0
          </span>
          {/* Live MCP status pill */}
          <a
            href="http://localhost:3030/"
            target="_blank"
            rel="noreferrer"
            className={`hidden md:inline-flex items-center gap-1.5 ml-2 text-[10px] font-mono uppercase tracking-wider rounded-full border px-2 py-0.5 transition-colors ${
              status.loading
                ? "border-white/10 text-muted-foreground bg-white/5"
                : status.online
                  ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20"
                  : "border-rose-500/40 text-rose-300 bg-rose-500/10"
            }`}
            title={
              status.loading
                ? "Checking MCP server..."
                : status.online
                  ? `MCP server online · ${status.toolCount} tools · ${status.categoryCount} categories`
                  : `MCP server offline${status.error ? `: ${status.error}` : ""}`
            }
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status.loading
                  ? "bg-muted-foreground animate-pulse"
                  : status.online
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-rose-400"
              }`}
            />
            {status.loading
              ? "checking"
              : status.online
                ? `MCP online · ${status.toolCount ?? toolCount}`
                : "MCP offline"}
          </a>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#categories" className="hover:text-foreground transition-colors">
            Categories
          </a>
          <a href="#browser" className="hover:text-foreground transition-colors">
            Tools
          </a>
          <a href="#install" className="hover:text-foreground transition-colors">
            Install
          </a>
          <span className="text-xs font-mono text-fuchsia-400 border border-fuchsia-500/30 bg-fuchsia-500/10 rounded px-2 py-0.5">
            {toolCount}+ tools
          </span>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="hidden sm:inline-flex text-muted-foreground hover:text-foreground hover:bg-white/5"
            onClick={onBrowse}
          >
            Browse
          </Button>
          <Button
            size="sm"
            onClick={onInstall}
            className="bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white hover:from-fuchsia-400 hover:to-cyan-400 shadow-md shadow-fuchsia-500/20"
          >
            Install
          </Button>
        </div>
      </div>
    </header>
  );
}
