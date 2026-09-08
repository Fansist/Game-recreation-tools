"use client";

import { Boxes, Github, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SiteFooterProps {
  toolCount: number;
  categoryCount: number;
}

export function SiteFooter({ toolCount, categoryCount }: SiteFooterProps) {
  return (
    <footer className="mt-auto border-t border-white/10 bg-card/30 backdrop-blur">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center">
                <Boxes className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-lg">WorldForge</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              An MCP server that ships {toolCount}+ tools for building 3D world
              sandbox and story games like GTA6. Compatible with Claude Code
              and Claude Desktop. Open, hackable, self-hostable.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground">
              Catalog
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{toolCount}+ MCP tools</li>
              <li>{categoryCount} categories</li>
              <li>Claude Code ready</li>
              <li>Claude Desktop ready</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground">
              Get started
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="#browser"
                  className="text-muted-foreground hover:text-fuchsia-300 transition-colors"
                >
                  Browse tools
                </a>
              </li>
              <li>
                <a
                  href="#install"
                  className="text-muted-foreground hover:text-fuchsia-300 transition-colors"
                >
                  Install guide
                </a>
              </li>
              <li>
                <a
                  href="#categories"
                  className="text-muted-foreground hover:text-fuchsia-300 transition-colors"
                >
                  Categories
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} WorldForge — Model Context Protocol
            toolkit. Built for game makers.
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              Built with <Heart className="h-3 w-3 text-fuchsia-400" /> for
              creators
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
