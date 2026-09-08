"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check,
  Copy,
  Terminal,
  Monitor,
  Plug,
  Zap,
  Boxes,
  Wrench,
  Download,
} from "lucide-react";
import { toast } from "sonner";

const STEPS_CODE: { [k: string]: string } = {
  desktop_config: `{
  "mcpServers": {
    "worldforge": {
      "command": "bun",
      "args": [
        "/absolute/path/to/worldforge/mcp-server/src/index.ts",
        "--stdio"
      ]
    }
  }
}`,
  code_cli: `claude mcp add worldforge \\
  -- bun /absolute/path/to/worldforge/mcp-server/src/index.ts --stdio`,
  clone: `# Clone / install the server once
cd your-project
mkdir -p mini-services/mcp-server

# Add the WorldForge server files (already included here)
# Install deps
cd mini-services/mcp-server
bun install

# Test it (HTTP server on port 3030 for sanity checks)
bun src/index.ts

# Run as stdio (the mode Claude uses)
bun src/index.ts --stdio`,
};

interface InstallGuideProps {
  toolCount: number;
  categoryCount: number;
}

export function InstallationGuide({ toolCount, categoryCount }: InstallGuideProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  };

  /** Trigger a browser download of the full claude_desktop_config.json. */
  const downloadConfig = () => {
    const blob = new Blob([STEPS_CODE.desktop_config], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "claude_desktop_config.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded claude_desktop_config.json");
  };

  return (
    <section id="install" className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-start mb-10">
          <Badge
            variant="outline"
            className="mb-3 gap-2 border-cyan-500/40 bg-cyan-500/10 text-cyan-300 rounded-full px-3 py-1"
          >
            <Plug className="h-3 w-3" />
            <span className="text-xs font-mono">install in 60 seconds</span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Plug {toolCount} tools into Claude
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            WorldForge speaks the standard Model Context Protocol, so it works
            in both Claude Desktop and Claude Code. Set it up once and every
            WorldForge tool becomes available to your AI assistant.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={downloadConfig}
              className="rounded-full border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/20"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Download claude_desktop_config.json
            </Button>
            <a
              href="http://localhost:3030/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-white/10 bg-white/5 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
            >
              <Plug className="h-3.5 w-3.5" />
              Inspect live MCP server (port 3030)
            </a>
          </div>
        </div>

        <Tabs defaultValue="desktop" className="w-full">
          <TabsList className="grid grid-cols-2 max-w-md bg-white/5 border border-white/10">
            <TabsTrigger
              value="desktop"
              className="data-[state=active]:bg-fuchsia-500/20 data-[state=active]:text-fuchsia-200"
            >
              <Monitor className="h-4 w-4 mr-2" />
              Claude Desktop
            </TabsTrigger>
            <TabsTrigger
              value="code"
              className="data-[state=active]:bg-fuchsia-500/20 data-[state=active]:text-fuchsia-200"
            >
              <Terminal className="h-4 w-4 mr-2" />
              Claude Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="desktop" className="mt-6">
            <Card className="border-white/10 bg-card/40 backdrop-blur p-6">
              <ol className="space-y-4">
                <Step n={1} title="Install the WorldForge server">
                  <p className="text-sm text-muted-foreground">
                    The server lives at{" "}
                    <code className="text-fuchsia-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">
                      mini-services/mcp-server/
                    </code>{" "}
                    inside your project. Just run{" "}
                    <code className="text-cyan-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">
                      bun install
                    </code>{" "}
                    in that folder once.
                  </p>
                </Step>

                <Step n={2} title="Open the Claude Desktop config file">
                  <p className="text-sm text-muted-foreground">
                    On macOS:{" "}
                    <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded">
                      ~/Library/Application Support/Claude/claude_desktop_config.json
                    </code>
                    <br />
                    On Windows:{" "}
                    <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded">
                      %APPDATA%\Claude\claude_desktop_config.json
                    </code>
                  </p>
                </Step>

                <Step n={3} title="Paste this config">
                  <CodeBlock
                    code={STEPS_CODE.desktop_config}
                    onCopy={() => copy(STEPS_CODE.desktop_config, "desktop")}
                    copied={copied === "desktop"}
                    filename="claude_desktop_config.json"
                  />
                </Step>

                <Step n={4} title="Restart Claude Desktop">
                  <p className="text-sm text-muted-foreground">
                    Quit Claude Desktop fully and relaunch it. Open a new chat
                    and ask Claude:{" "}
                    <em className="text-foreground">
                      “Use WorldForge to generate a hero character.”
                    </em>{" "}
                    Claude will see all {toolCount} tools across {categoryCount}{" "}
                    categories.
                  </p>
                </Step>
              </ol>
            </Card>
          </TabsContent>

          <TabsContent value="code" className="mt-6">
            <Card className="border-white/10 bg-card/40 backdrop-blur p-6">
              <ol className="space-y-4">
                <Step n={1} title="Install the WorldForge server">
                  <p className="text-sm text-muted-foreground">
                    Same as above —{" "}
                    <code className="text-cyan-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">
                      cd mini-services/mcp-server && bun install
                    </code>
                    . No global install needed.
                  </p>
                </Step>

                <Step n={2} title="Register WorldForge with the Claude Code CLI">
                  <p className="text-sm text-muted-foreground mb-3">
                    Run this one command in any terminal:
                  </p>
                  <CodeBlock
                    code={STEPS_CODE.code_cli}
                    onCopy={() => copy(STEPS_CODE.code_cli, "code")}
                    copied={copied === "code"}
                    filename="shell"
                  />
                </Step>

                <Step n={3} title="Start coding with Claude">
                  <p className="text-sm text-muted-foreground">
                    Launch Claude Code in your project and ask it to build
                    anything — a procedural city, a cutscene, a driving model,
                    an NPC with goals. Claude will pick the right WorldForge
                    tools automatically.
                  </p>
                </Step>

                <Step n={4} title="Verify with the HTTP server (optional)">
                  <p className="text-sm text-muted-foreground mb-3">
                    The same server also runs as an HTTP endpoint for sanity
                    checks in the dev sandbox:
                  </p>
                  <CodeBlock
                    code={`bun mini-services/mcp-server/src/index.ts
# → GET http://localhost:3030/tools returns all ${toolCount} tools as JSON`}
                    onCopy={() => copy("bun mini-services/mcp-server/src/index.ts", "verify")}
                    copied={copied === "verify"}
                    filename="shell"
                  />
                </Step>
              </ol>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Highlight cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            icon={<Zap className="h-5 w-5" />}
            title="Zero magic, all standard"
            description="Pure Model Context Protocol over stdio. No proprietary clients, no cloud, no telemetry."
            accent="from-fuchsia-500 to-pink-500"
          />
          <FeatureCard
            icon={<Boxes className="h-5 w-5" />}
            title={`All ${toolCount}+ tools ready`}
            description="One server, every tool. Browse, filter, and call any of them from a single Claude session."
            accent="from-cyan-500 to-blue-500"
          />
          <FeatureCard
            icon={<Wrench className="h-5 w-5" />}
            title="Self-hostable, hackable"
            description="Open TypeScript. Replace the mock handlers with real game-engine calls — keep the same MCP contract."
            accent="from-emerald-500 to-teal-500"
          />
        </div>
      </div>
    </section>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <div className="shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-500 text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-fuchsia-500/20">
        {n}
      </div>
      <div className="flex-1 pt-1">
        <h4 className="text-sm font-semibold mb-1">{title}</h4>
        {children}
      </div>
    </li>
  );
}

function CodeBlock({
  code,
  onCopy,
  copied,
  filename,
}: {
  code: string;
  onCopy: () => void;
  copied: boolean;
  filename: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-background/60 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          {filename}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs hover:bg-white/10"
          onClick={onCopy}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          <span className="ml-1.5">{copied ? "Copied" : "Copy"}</span>
        </Button>
      </div>
      <pre className="text-xs font-mono p-3 overflow-x-auto text-cyan-100/90 leading-relaxed">
{code}
      </pre>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-white/10 bg-card/40 backdrop-blur p-5 hover:bg-card/60 hover:border-white/20 transition-colors h-full">
        <div
          className={`inline-flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br ${accent} shadow-lg mb-4`}
        >
          {icon}
        </div>
        <h3 className="text-base font-semibold mb-1.5">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </Card>
    </motion.div>
  );
}
