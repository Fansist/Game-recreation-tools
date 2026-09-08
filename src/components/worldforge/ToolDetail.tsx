"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check,
  Copy,
  Terminal,
  Monitor,
  ArrowRight,
  Code2,
  Plug,
  Play,
  Loader2,
  AlertCircle,
  Sparkles,
  Zap,
  Clipboard,
  ImageIcon,
  Volume2,
  Star,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import type { FlatTool, ToolInput } from "@/data/catalog-index";
import { CategoryIcon } from "./icons";
import { useRealTools } from "./useRealTools";

interface ToolDetailProps {
  tool: FlatTool | null;
  onClose: () => void;
  isFavorite?: (toolName: string) => boolean;
  onToggleFavorite?: (toolName: string) => void;
}

export function ToolDetail({ tool, onClose, isFavorite, onToggleFavorite }: ToolDetailProps) {
  if (!tool) return null;
  return (
    <ToolDetailInner
      key={tool.name}
      tool={tool}
      onClose={onClose}
      isFavorite={isFavorite}
      onToggleFavorite={onToggleFavorite}
    />
  );
}

/** Default value for an input, used to prefill the Try-It form. */
function defaultForInput(input: ToolInput): string {
  if (input.default !== undefined) return String(input.default);
  switch (input.type) {
    case "string":
      return "";
    case "number":
      return input.min !== undefined ? String(input.min) : "0";
    case "boolean":
      return "false";
    case "enum":
      return input.enum?.[0] ?? "";
    case "array":
      return "";
    case "object":
      return "{}";
    default:
      return "";
  }
}

/** Parses a string form value back into the proper type for the MCP call. */
function parseValue(input: ToolInput, raw: string): unknown {
  switch (input.type) {
    case "number": {
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    }
    case "boolean":
      return raw === "true" || raw === "1";
    case "array": {
      // Comma-separated → string[].
      const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
      return parts;
    }
    case "object":
      try {
        return JSON.parse(raw || "{}");
      } catch {
        return {};
      }
    default:
      return raw;
  }
}

function ToolDetailInner({
  tool,
  onClose,
  isFavorite,
  onToggleFavorite,
}: {
  tool: FlatTool;
  onClose: () => void;
  isFavorite?: (toolName: string) => boolean;
  onToggleFavorite?: (toolName: string) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const { realTools } = useRealTools();
  const isReal = realTools.has(tool.name);
  // Try-it-live state
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const input of tool.inputs) init[input.name] = defaultForInput(input);
    return init;
  });
  const [tryResult, setTryResult] = useState<string | null>(null);
  const [tryImage, setTryImage] = useState<string | null>(null);
  const [tryAudio, setTryAudio] = useState<string | null>(null);
  const [tryIsReal, setTryIsReal] = useState(false);
  const [tryError, setTryError] = useState<string | null>(null);
  const [trying, setTrying] = useState(false);

  // Track recently-viewed tools in localStorage.
  useEffect(() => {
    try {
      const key = "worldforge-recent-tools";
      const raw = localStorage.getItem(key);
      const list: string[] = raw ? JSON.parse(raw) : [];
      const next = [tool.name, ...list.filter((n) => n !== tool.name)].slice(0, 12);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // localStorage may be unavailable (private mode) — ignore.
    }
  }, [tool.name]);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  };

  const copyToolName = () => {
    navigator.clipboard.writeText(tool.name);
    toast.success(`Copied "${tool.name}" — paste into Claude`);
  };

  /** Builds a ready-to-paste Claude prompt that asks Claude to call this tool. */
  const buildClaudePrompt = (): string => {
    const argLines = tool.inputs
      .map((input) => {
        const val = formValues[input.name] ?? defaultForInput(input);
        return `  - ${input.name}: ${val} (${input.type}${input.required ? ", required" : ""})`;
      })
      .join("\n");
    return `Use the WorldForge MCP tool "${tool.name}" to ${tool.title.toLowerCase()}.

Arguments:
${argLines}

Context: ${tool.description}
Expected return: ${tool.returns}`;
  };

  const copyClaudePrompt = () => {
    const prompt = buildClaudePrompt();
    navigator.clipboard.writeText(prompt);
    toast.success("Copied ready-to-paste Claude prompt");
  };

  /** Builds a ready-to-run curl command for the MCP /call endpoint. */
  const buildCurlCommand = (): string => {
    const args: Record<string, unknown> = {};
    for (const input of tool.inputs) {
      args[input.name] = parseValue(input, formValues[input.name] ?? "");
    }
    const payload = JSON.stringify({ name: tool.name, arguments: args });
    return `curl -s -X POST http://localhost:3030/call \\
  -H 'Content-Type: application/json' \\
  -d '${payload.replace(/'/g, "'\\''")}'`;
  };

  const copyCurlCommand = () => {
    const cmd = buildCurlCommand();
    navigator.clipboard.writeText(cmd);
    toast.success("Copied curl command — paste in terminal");
  };

  /** Copies a shareable URL with #tool=<name> deep link. */
  const shareTool = async () => {
    const url = `${window.location.origin}/#tool=${encodeURIComponent(tool.name)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`Copied share link for "${tool.name}"`);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      toast.success(`Copied share link for "${tool.name}"`);
    }
  };

  /** Copies the tool's JSON Schema (input definition) to clipboard. */
  const copyJsonSchema = () => {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const input of tool.inputs) {
      const schema: Record<string, unknown> = { description: input.description };
      if (input.type === "enum") {
        schema.type = "string";
        schema.enum = input.enum || [];
      } else if (input.type === "array") {
        schema.type = "array";
        schema.items = { type: "string" };
      } else if (input.type === "object") {
        schema.type = "object";
      } else {
        schema.type = input.type;
      }
      if (input.default !== undefined) schema.default = input.default;
      if (input.min !== undefined) (schema as any).minimum = input.min;
      if (input.max !== undefined) (schema as any).maximum = input.max;
      properties[input.name] = schema;
      if (input.required) required.push(input.name);
    }
    const jsonSchema = {
      type: "object",
      properties,
      required,
      additionalProperties: false,
    };
    navigator.clipboard.writeText(JSON.stringify(jsonSchema, null, 2));
    toast.success("Copied JSON Schema for tool inputs");
  };

  /** Tracks that this tool was actually run (not just viewed), with result. */
  const trackUsed = (resultText: string, isReal: boolean) => {
    try {
      const key = "worldforge-used-tools";
      const raw = localStorage.getItem(key);
      const list: string[] = raw ? JSON.parse(raw) : [];
      const next = [tool.name, ...list.filter((n) => n !== tool.name)].slice(0, 8);
      localStorage.setItem(key, JSON.stringify(next));

      // Also store run history with results (max 20 entries).
      const histKey = "worldforge-run-history";
      const histRaw = localStorage.getItem(histKey);
      const hist: Array<{
        toolName: string;
        title: string;
        result: string;
        isReal: boolean;
        timestamp: number;
      }> = histRaw ? JSON.parse(histRaw) : [];
      const entry = {
        toolName: tool.name,
        title: tool.title,
        result: resultText.slice(0, 500),
        isReal,
        timestamp: Date.now(),
      };
      const nextHist = [entry, ...hist].slice(0, 20);
      localStorage.setItem(histKey, JSON.stringify(nextHist));
    } catch {
      // ignore
    }
  };

  const runTool = async () => {
    setTrying(true);
    setTryError(null);
    setTryResult(null);
    setTryImage(null);
    setTryAudio(null);
    setTryIsReal(false);
    try {
      const args: Record<string, unknown> = {};
      for (const input of tool.inputs) {
        args[input.name] = parseValue(input, formValues[input.name] ?? "");
      }
      const res = await fetch("/api/mcp-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tool.name, arguments: args }),
      });
      const data = await res.json();
      if (data.ok) {
        setTryResult(data.result);
        setTryImage(data.imageBase64 || null);
        setTryAudio(data.audioBase64 || null);
        setTryIsReal(data.real === true);
        trackUsed(data.result, data.real === true);
        toast.success(
          data.real
            ? "Real SDK call succeeded"
            : "Tool executed (simulated)",
        );
      } else {
        setTryError(data.error || "Unknown error");
        toast.error("Tool execution failed");
      }
    } catch (e) {
      setTryError(e instanceof Error ? e.message : String(e));
      toast.error("Network error");
    } finally {
      setTrying(false);
    }
  };

  // Build Claude Desktop config snippet
  const claudeDesktopConfig = {
    mcpServers: {
      worldforge: {
        command: "bun",
        args: [
          "/absolute/path/to/worldforge/mcp-server/src/index.ts",
          "--stdio",
        ],
      },
    },
  };

  // Build Claude Code (CLI) config snippet
  const claudeCodeCmd =
    `claude mcp add worldforge -- bun /absolute/path/to/worldforge/mcp-server/src/index.ts --stdio`;

  const claudePromptExample = `In Claude, just ask:

  "Use ${tool.name} to ${tool.title.toLowerCase()} — ${sampleExampleHint(tool)}"

Claude will call this tool automatically and use the result.`;

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl bg-card/95 backdrop-blur-xl border-l-white/10 p-0"
      >
        <SheetHeader className="p-6 pb-2 border-b border-white/10">
          <div className="flex items-start gap-4">
            <div
              className={`shrink-0 inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br ${tool.categoryAccent} shadow-lg`}
            >
              <CategoryIcon name={tool.categoryIcon} className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-muted-foreground uppercase tracking-wider">
                  {tool.category}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                <span className="text-fuchsia-400 truncate">{tool.name}</span>
                <button
                  onClick={copyToolName}
                  title="Copy tool name (paste into Claude)"
                  className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors shrink-0"
                >
                  <Clipboard className="h-2.5 w-2.5" />
                  copy
                </button>
                <button
                  onClick={shareTool}
                  title="Copy shareable link (#tool=name deep link)"
                  className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200 transition-colors shrink-0"
                >
                  <Share2 className="h-2.5 w-2.5" />
                  share
                </button>
                <button
                  onClick={copyJsonSchema}
                  title="Copy JSON Schema for tool inputs"
                  className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 hover:text-violet-200 transition-colors shrink-0"
                >
                  <Code2 className="h-2.5 w-2.5" />
                  schema
                </button>
                {onToggleFavorite && (
                  <button
                    onClick={() => onToggleFavorite(tool.name)}
                    title={
                      isFavorite?.(tool.name)
                        ? "Remove from favorites"
                        : "Add to favorites"
                    }
                    className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border transition-colors shrink-0 ${
                      isFavorite?.(tool.name)
                        ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-amber-300"
                    }`}
                  >
                    <Star
                      className={`h-2.5 w-2.5 ${
                        isFavorite?.(tool.name) ? "fill-amber-300" : ""
                      }`}
                    />
                    {isFavorite?.(tool.name) ? "favorited" : "favorite"}
                  </button>
                )}
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
              <SheetTitle className="mt-1 text-xl">{tool.title}</SheetTitle>
              <SheetDescription className="mt-1.5 leading-relaxed">
                {tool.description}
              </SheetDescription>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tool.tags.slice(0, 6).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] bg-white/5 border-white/10 text-muted-foreground"
              >
                #{tag}
              </Badge>
            ))}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="p-6 space-y-6">
            {/* Inputs section */}
            <section>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Code2 className="h-4 w-4 text-cyan-400" />
                Input parameters ({tool.inputs.length})
              </h3>
              <div className="space-y-2">
                {tool.inputs.map((input) => (
                  <div
                    key={input.name}
                    className="rounded-lg border border-white/10 bg-background/40 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs font-mono text-fuchsia-300">
                        {input.name}
                      </code>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono border-cyan-500/30 text-cyan-300 py-0 h-5"
                        >
                          {input.type}
                          {input.type === "enum" && input.enum
                            ? ` · ${input.enum.length} opts`
                            : ""}
                        </Badge>
                        {input.required ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-rose-500/30 text-rose-300 py-0 h-5"
                          >
                            required
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-white/10 text-muted-foreground py-0 h-5"
                          >
                            optional
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {input.description}
                    </p>
                    {input.enum && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {input.enum.map((opt) => (
                          <code
                            key={opt}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-foreground/80"
                          >
                            {opt}
                          </code>
                        ))}
                      </div>
                    )}
                    {input.default !== undefined && (
                      <div className="mt-2 text-[10px] text-muted-foreground">
                        default:{" "}
                        <code className="text-foreground/80">
                          {JSON.stringify(input.default)}
                        </code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Returns */}
            <section>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <ArrowRight className="h-4 w-4 text-emerald-400" />
                Returns
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed rounded-lg border border-white/10 bg-background/40 p-3">
                {tool.returns}
              </p>
              {tool.sampleText && (
                <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <div className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider mb-1">
                    sample response
                  </div>
                  <p className="text-sm text-emerald-100/90 font-mono">
                    {tool.sampleText}
                  </p>
                </div>
              )}
            </section>

            {/* Try it live */}
            <section>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Try it live
              </h3>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Fill in the args and run — your inputs go straight to the
                  live WorldForge MCP server on port 3030 and you'll see the
                  actual tool response. (Same call Claude would make.)
                </p>
                <div className="space-y-2">
                  {tool.inputs.map((input) => (
                    <div key={input.name} className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2 items-center">
                      <label className="text-xs font-mono">
                        <span className="text-fuchsia-300">{input.name}</span>
                        <span className="text-muted-foreground ml-1">
                          ({input.type}
                          {input.required ? "" : "?"})
                        </span>
                      </label>
                      {input.type === "enum" ? (
                        <select
                          value={formValues[input.name] ?? ""}
                          onChange={(e) =>
                            setFormValues((v) => ({ ...v, [input.name]: e.target.value }))
                          }
                          className="h-8 px-2 rounded-md bg-background/60 border border-white/10 text-xs font-mono"
                        >
                          {input.enum?.map((opt) => (
                            <option key={opt} value={opt} className="bg-background">
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : input.type === "boolean" ? (
                        <select
                          value={formValues[input.name] ?? "false"}
                          onChange={(e) =>
                            setFormValues((v) => ({ ...v, [input.name]: e.target.value }))
                          }
                          className="h-8 px-2 rounded-md bg-background/60 border border-white/10 text-xs font-mono"
                        >
                          <option value="false" className="bg-background">false</option>
                          <option value="true" className="bg-background">true</option>
                        </select>
                      ) : (
                        <Input
                          value={formValues[input.name] ?? ""}
                          onChange={(e) =>
                            setFormValues((v) => ({ ...v, [input.name]: e.target.value }))
                          }
                          placeholder={
                            input.type === "array"
                              ? "comma,separated,values"
                              : input.type === "object"
                                ? "{}"
                                : input.type === "number"
                                  ? "0"
                                  : "value"
                          }
                          className="h-8 text-xs font-mono bg-background/60 border-white/10"
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={runTool}
                    disabled={trying}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 shadow-md shadow-amber-500/20"
                  >
                    {trying ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {trying ? "Running..." : "Run tool"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyClaudePrompt}
                    className="border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 hover:text-cyan-100"
                    title="Copy a ready-to-paste prompt that asks Claude to call this tool with the current args"
                  >
                    <Terminal className="h-3.5 w-3.5 mr-1.5" />
                    Copy as Claude prompt
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyCurlCommand}
                    className="border-violet-500/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20 hover:text-violet-100"
                    title="Copy a ready-to-run curl command for the MCP /call endpoint"
                  >
                    <Terminal className="h-3.5 w-3.5 mr-1.5" />
                    Copy as curl
                  </Button>
                </div>
                <div className="mt-1.5">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    POST /api/mcp-call → localhost:3030/call
                  </span>
                </div>
                {tryError && (
                  <div className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/10 p-2.5 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
                    <pre className="text-[11px] text-rose-200 font-mono whitespace-pre-wrap break-words flex-1">
{tryError}
                    </pre>
                  </div>
                )}
                {tryResult && (
                  <div className={`mt-3 rounded-md border p-2.5 ${tryIsReal ? "border-emerald-500/40 bg-emerald-500/10" : "border-cyan-500/30 bg-cyan-500/5"}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className={`text-[10px] font-mono uppercase tracking-wider inline-flex items-center gap-1 ${tryIsReal ? "text-emerald-400" : "text-cyan-400"}`}>
                        {tryIsReal ? (
                          <>
                            <Zap className="h-3 w-3" />
                            real response · z-ai-web-dev-sdk
                          </>
                        ) : (
                          "response · simulated"
                        )}
                      </div>
                    </div>
                    <pre className="text-[11px] text-emerald-100/90 font-mono whitespace-pre-wrap break-words leading-relaxed">
{tryResult}
                    </pre>
                    {tryImage && (
                      <div className="mt-3 rounded-md border border-emerald-500/30 bg-black/30 overflow-hidden">
                        <div className="px-2 py-1 border-b border-emerald-500/20 text-[10px] font-mono uppercase tracking-wider text-emerald-400 inline-flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          generated image
                        </div>
                        <img
                          src={`data:image/png;base64,${tryImage}`}
                          alt="Generated by tool"
                          className="w-full h-auto block"
                        />
                      </div>
                    )}
                    {tryAudio && (
                      <div className="mt-3 rounded-md border border-emerald-500/30 bg-black/30 p-2">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 inline-flex items-center gap-1 mb-1.5">
                          <Volume2 className="h-3 w-3" />
                          generated audio
                        </div>
                        <audio
                          controls
                          src={`data:audio/mpeg;base64,${tryAudio}`}
                          className="w-full h-8"
                        >
                          Your browser does not support audio playback.
                        </audio>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Install / call tabs */}
            <section>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Plug className="h-4 w-4 text-fuchsia-400" />
                Use this tool
              </h3>
              <Tabs defaultValue="prompt" className="w-full">
                <TabsList className="grid grid-cols-3 w-full bg-white/5 border border-white/10">
                  <TabsTrigger
                    value="prompt"
                    className="text-xs data-[state=active]:bg-fuchsia-500/20 data-[state=active]:text-fuchsia-200"
                  >
                    Prompt
                  </TabsTrigger>
                  <TabsTrigger
                    value="desktop"
                    className="text-xs data-[state=active]:bg-fuchsia-500/20 data-[state=active]:text-fuchsia-200"
                  >
                    <Monitor className="h-3.5 w-3.5 mr-1" />
                    Desktop
                  </TabsTrigger>
                  <TabsTrigger
                    value="code"
                    className="text-xs data-[state=active]:bg-fuchsia-500/20 data-[state=active]:text-fuchsia-200"
                  >
                    <Terminal className="h-3.5 w-3.5 mr-1" />
                    Code
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="prompt" className="mt-3">
                  <div className="rounded-lg border border-white/10 bg-background/40 p-4">
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                      {claudePromptExample}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="desktop" className="mt-3">
                  <CodeBlock
                    code={JSON.stringify(claudeDesktopConfig, null, 2)}
                    filename="claude_desktop_config.json"
                    onCopy={() =>
                      copy(
                        JSON.stringify(claudeDesktopConfig, null, 2),
                        "desktop",
                      )
                    }
                    copied={copied === "desktop"}
                  />
                </TabsContent>

                <TabsContent value="code" className="mt-3">
                  <CodeBlock
                    code={claudeCodeCmd}
                    filename="shell"
                    onCopy={() => copy(claudeCodeCmd, "code")}
                    copied={copied === "code"}
                  />
                </TabsContent>
              </Tabs>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
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

function sampleExampleHint(tool: FlatTool): string {
  const firstInput = tool.inputs[0];
  if (!firstInput) return "see what comes back.";
  return `pass ${firstInput.name}="${firstInput.type === "string" ? "example" : "..."}"`;
}
