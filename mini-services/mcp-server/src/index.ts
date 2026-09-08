/**
 * WorldForge MCP Server — Refined for Claude
 * -------------------------------------------
 * Exposes 3000+ tools for building 3D world sandbox and story games like GTA6
 * AND city builder games like Cities Skylines.
 *
 * Key refinements for Claude:
 * - Rich tool descriptions with when-to-use guidance
 * - Input schemas with examples for each parameter
 * - Meta-tools for browsing: list_categories, search_tools, get_tool_help
 * - Server instructions explaining how to use the toolkit
 * - Tool annotations (readOnly vs readWrite)
 * - Token-efficient tools/list (compact but complete)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { allCategories, allTools } from "../../../src/data/catalog-index.ts";
import {
  hasRealHandler,
  runRealHandler,
  type RealHandlerResult,
} from "./real-handlers.ts";

/* ------------------------------------------------------------------ */
/* Logging                                                              */
/* ------------------------------------------------------------------ */

function log(...args: unknown[]) {
  process.stderr.write(`[worldforge-mcp] ${args.join(" ")}\n`);
}

/* ------------------------------------------------------------------ */
/* Index for fast lookups                                                */
/* ------------------------------------------------------------------ */

// Build a map of category_id → tools for the meta-tools.
const toolsByCategory = new Map<string, typeof allTools>();
for (const cat of allCategories) {
  toolsByCategory.set(cat.id, allTools.filter((t) => t.category === cat.id));
}

// Build a map of tool_name → tool for fast lookup.
const toolByName = new Map(allTools.map((t) => [t.name, t]));

/* ------------------------------------------------------------------ */
/* Convert ToolInput[] to JSON Schema (for MCP)                         */
/* ------------------------------------------------------------------ */

function inputsToJsonSchema(inputs: any[]) {
  const properties: Record<string, any> = {};
  const required: string[] = [];
  for (const input of inputs) {
    const schema: Record<string, any> = {
      description: input.description,
    };
    switch (input.type) {
      case "string":
        schema.type = "string";
        if (input.default !== undefined) schema.default = input.default;
        break;
      case "number":
        schema.type = "number";
        if (input.min !== undefined) schema.minimum = input.min;
        if (input.max !== undefined) schema.maximum = input.max;
        if (input.default !== undefined) schema.default = input.default;
        break;
      case "boolean":
        schema.type = "boolean";
        if (input.default !== undefined) schema.default = input.default;
        break;
      case "enum":
        schema.type = "string";
        schema.enum = input.enum || [];
        if (input.default !== undefined) schema.default = input.default;
        break;
      case "array":
        schema.type = "array";
        schema.items = { type: "string" };
        break;
      case "object":
        schema.type = "object";
        break;
    }
    properties[input.name] = schema;
    if (input.required) required.push(input.name);
  }
  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}

/* ------------------------------------------------------------------ */
/* Build rich description for each tool (what Claude sees)              */
/* ------------------------------------------------------------------ */

function buildToolDescription(tool: any): string {
  const parts: string[] = [];

  // Category prefix + REAL badge
  const realBadge = hasRealHandler(tool.name) ? " 🟢REAL" : "";
  parts.push(`[${tool.categoryName}${realBadge}]`);

  // Main description
  parts.push(tool.description);

  // What it returns
  parts.push(`\nReturns: ${tool.returns}`);

  // Tags for discoverability
  if (tool.tags?.length) {
    parts.push(`\nTags: ${tool.tags.join(", ")}`);
  }

  // Sample output
  if (tool.sampleText) {
    parts.push(`\nExample output: ${tool.sampleText}`);
  }

  return parts.join(" ");
}

/* ------------------------------------------------------------------ */
/* Meta-tools: navigation helpers for Claude                           */
/* ------------------------------------------------------------------ */

/** Lists all categories with tool counts. */
function metaListCategories(): string {
  const lines = allCategories.map((cat) => {
    const count = toolsByCategory.get(cat.id)?.length || 0;
    return `📁 ${cat.id} (${count} tools) — ${cat.name}: ${cat.description}`;
  });
  return [
    `WorldForge has ${allCategories.length} categories with ${allTools.length} total tools.`,
    ``,
    ...lines,
    ``,
    `💡 Use 'worldforge_list_tools_in_category' with a category_id to see all tools in that category.`,
    `💡 Use 'worldforge_search_tools' with a keyword to find tools across all categories.`,
  ].join("\n");
}

/** Lists all tools in a specific category. */
function metaListToolsInCategory(args: Record<string, unknown>): string {
  const categoryId = String(args.category_id || "");
  const tools = toolsByCategory.get(categoryId);
  if (!tools || tools.length === 0) {
    const validIds = allCategories.map((c) => c.id).join(", ");
    return `Category '${categoryId}' not found. Valid categories: ${validIds}`;
  }
  const cat = allCategories.find((c) => c.id === categoryId)!;
  const lines = tools.map((t) => {
    const real = hasRealHandler(t.name) ? " 🟢REAL" : "";
    const inputs = t.inputs.map((i: any) => `${i.name}${i.required ? "*" : ""}:${i.type}`).join(", ");
    return `  • ${t.name}${real} — ${t.title}\n    Args: ${inputs || "(none)"}\n    Returns: ${t.returns}`;
  });
  return [
    `📋 Category: ${cat.name} (${tools.length} tools)`,
    `${cat.description}`,
    ``,
    ...lines,
    ``,
    `💡 Call any tool by its name. Required args marked with *.`,
  ].join("\n");
}

/** Searches tools by keyword across all categories. */
function metaSearchTools(args: Record<string, unknown>): string {
  const query = String(args.query || "").toLowerCase().trim();
  if (!query) {
    return "Please provide a 'query' parameter to search for tools.";
  }
  const max = Number(args.max_results || 20);
  const results = allTools
    .filter((t) => {
      const haystack = `${t.name} ${t.title} ${t.description} ${t.tags.join(" ")} ${t.categoryName}`.toLowerCase();
      return haystack.includes(query);
    })
    .slice(0, max);
  if (results.length === 0) {
    return `No tools found matching '${query}'. Try a different keyword or use 'worldforge_list_categories' to browse all categories.`;
  }
  const lines = results.map((t) => {
    const real = hasRealHandler(t.name) ? " 🟢REAL" : "";
    return `  • ${t.name}${real} [${t.categoryName}] — ${t.title}\n    ${t.description}`;
  });
  return [
    `🔍 Found ${results.length} tool(s) matching '${query}':`,
    ``,
    ...lines,
    ``,
    `💡 Use 'worldforge_get_tool_help' with a tool name for detailed usage info.`,
  ].join("\n");
}

/** Gets detailed help for a specific tool. */
function metaGetToolHelp(args: Record<string, unknown>): string {
  const toolName = String(args.tool_name || "");
  const tool = toolByName.get(toolName);
  if (!tool) {
    return `Tool '${toolName}' not found. Use 'worldforge_search_tools' to find the right tool name.`;
  }
  const real = hasRealHandler(toolName) ? "🟢 REAL SDK handler (calls z-ai-web-dev-sdk)" : "⚪ SIMULATED (returns formatted preview, not real AI generation)";
  const inputLines = tool.inputs.map((i: any) => {
    const req = i.required ? "required" : "optional";
    const def = i.default !== undefined ? `, default: ${JSON.stringify(i.default)}` : "";
    const enumOpts = i.enum ? `, options: [${i.enum.join(", ")}]` : "";
    const minMax = i.min !== undefined || i.max !== undefined ? `, range: ${i.min ?? "−∞"}–${i.max ?? "+∞"}` : "";
    return `  • ${i.name} (${i.type}, ${req}${def}${enumOpts}${minMax})\n    ${i.description}`;
  });
  return [
    `📖 Tool: ${tool.name}`,
    `Category: ${tool.categoryName}`,
    `Mode: ${real}`,
    ``,
    `Description: ${tool.description}`,
    ``,
    `Parameters (${tool.inputs.length}):`,
    inputLines.length ? inputLines.join("\n") : "  (no parameters)",
    ``,
    `Returns: ${tool.returns}`,
    ``,
    tool.sampleText ? `Example: ${tool.sampleText}` : "",
    ``,
    `Tags: ${tool.tags.join(", ")}`,
  ].filter(Boolean).join("\n");
}

/** Returns a quick overview of the whole toolkit (for Claude's first interaction). */
function metaOverview(): string {
  const realCount = allTools.filter((t) => hasRealHandler(t.name)).length;
  return [
    `🏗️  WorldForge MCP Server — Overview`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `${allTools.length} tools across ${allCategories.length} categories for building:`,
    `  • 3D world sandbox & story games (like GTA6) — 56 categories, 1617 tools`,
    `  • City builder games (like Cities Skylines) — 56 categories, 1481 tools`,
    ``,
    `${realCount} tools have REAL SDK handlers (call z-ai-web-dev-sdk for actual LLM, image gen, TTS).`,
    `The remaining ${allTools.length - realCount} tools return simulated responses (formatted previews).`,
    ``,
    `📖 How to use:`,
    `  1. 'worldforge_list_categories' — see all 112 categories`,
    `  2. 'worldforge_list_tools_in_category' — browse tools in a category`,
    `  3. 'worldforge_search_tools' — find tools by keyword`,
    `  4. 'worldforge_get_tool_help' — get detailed help for a specific tool`,
    `  5. Then call any tool directly by its name`,
    ``,
    `💡 Tip: Tools with 🟢REAL badge actually call z-ai-web-dev-sdk (LLM, image gen, TTS).`,
    `   Other tools return structured simulated responses showing what the tool would produce.`,
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* Tool dispatch                                                        */
/* ------------------------------------------------------------------ */

function summarizeArgs(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([k, v]) => {
      let valStr: string;
      if (typeof v === "string") valStr = v.length > 80 ? `${v.slice(0, 77)}...` : v;
      else if (Array.isArray(v)) valStr = `[${v.length} item${v.length === 1 ? "" : "s"}]`;
      else if (v && typeof v === "object") valStr = "{...}";
      else valStr = String(v);
      return `  • ${k}: ${valStr}`;
    })
    .join("\n");
}

function simulateTool(toolName: string, args: Record<string, unknown>): RealHandlerResult {
  const tool = toolByName.get(toolName);
  if (!tool) {
    return { text: `Error: unknown tool '${toolName}'` };
  }
  const argSummary = summarizeArgs(args);
  const sample = tool.sampleText || "Tool executed successfully.";
  const text = [
    `🛠️  ${tool.title}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Category: ${tool.categoryName}`,
    `Mode: ⚪ SIMULATED (no real SDK handler registered)`,
    ``,
    `📥 Input arguments:`,
    argSummary || "  (no arguments)",
    ``,
    `📤 Result: ${tool.returns}`,
    ``,
    `✅ ${sample}`,
    ``,
    `ℹ️  Tool '${toolName}' (compatible with Claude Code & Claude Desktop)`,
  ].join("\n");
  return { text };
}

async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<RealHandlerResult> {
  // Meta-tools
  if (toolName === "worldforge_overview") {
    return { text: metaOverview() };
  }
  if (toolName === "worldforge_list_categories") {
    return { text: metaListCategories() };
  }
  if (toolName === "worldforge_list_tools_in_category") {
    return { text: metaListToolsInCategory(args) };
  }
  if (toolName === "worldforge_search_tools") {
    return { text: metaSearchTools(args) };
  }
  if (toolName === "worldforge_get_tool_help") {
    return { text: metaGetToolHelp(args) };
  }

  // Real handler path
  if (hasRealHandler(toolName)) {
    try {
      const result = await runRealHandler(toolName, args);
      if (result) return result;
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      const sim = simulateTool(toolName, args);
      return {
        text: `${sim.text}\n\n⚠️  Real handler failed: ${errMsg}\n(Falling back to simulated response.)`,
      };
    }
  }
  return simulateTool(toolName, args);
}

/* ------------------------------------------------------------------ */
/* Meta-tool definitions (always present in tools/list)                */
/* ------------------------------------------------------------------ */

const metaTools = [
  {
    name: "worldforge_overview",
    description: "Get a high-level overview of the WorldForge MCP server: total tools, categories, how to browse, and which tools have real AI handlers. Call this FIRST to understand the toolkit.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
      additionalProperties: false,
    },
  },
  {
    name: "worldforge_list_categories",
    description: "List all 112 tool categories with tool counts and descriptions. Use this to browse the catalog by topic. Returns category IDs you can pass to 'worldforge_list_tools_in_category'.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
      additionalProperties: false,
    },
  },
  {
    name: "worldforge_list_tools_in_category",
    description: "List all tools in a specific category. Returns tool names, titles, arguments, and return descriptions. Use after 'worldforge_list_categories' to drill into a topic.",
    inputSchema: {
      type: "object" as const,
      properties: {
        category_id: {
          type: "string",
          description: "The category ID (e.g. 'characters', 'city_zoning', 'npc_combat'). Get valid IDs from 'worldforge_list_categories'.",
        },
      },
      required: ["category_id"],
      additionalProperties: false,
    },
  },
  {
    name: "worldforge_search_tools",
    description: "Search all 3098 tools by keyword. Matches against tool name, title, description, tags, and category. Returns up to 20 matching tools with names and descriptions.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search keyword (e.g. 'hero', 'gunshot', 'zoning', 'metro', 'fire')",
        },
        max_results: {
          type: "number",
          description: "Max results to return (default 20, max 50)",
          default: 20,
          minimum: 1,
          maximum: 50,
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "worldforge_get_tool_help",
    description: "Get detailed help for a specific tool: full description, parameter types, defaults, enum options, range constraints, return format, and example output. Call this before using a tool for the first time.",
    inputSchema: {
      type: "object" as const,
      properties: {
        tool_name: {
          type: "string",
          description: "The fully-qualified tool name (e.g. 'characters_generate_hero', 'city_build_metro_station')",
        },
      },
      required: ["tool_name"],
      additionalProperties: false,
    },
  },
];

/* ------------------------------------------------------------------ */
/* Build the MCP server                                                 */
/* ------------------------------------------------------------------ */

function buildServer(): Server {
  const server = new Server(
    {
      name: "worldforge-mcp",
      version: "2.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
      instructions: [
        "WorldForge is an MCP server with 3000+ tools for building 3D games (like GTA6) and city builder games (like Cities Skylines).",
        "",
        "HOW TO USE:",
        "1. Call 'worldforge_overview' to understand the toolkit.",
        "2. Call 'worldforge_list_categories' to see all 112 categories.",
        "3. Call 'worldforge_search_tools' with a keyword to find relevant tools.",
        "4. Call 'worldforge_get_tool_help' with a tool name for detailed usage.",
        "5. Then call the tool directly by its name.",
        "",
        "Tools with 🟢REAL badge call z-ai-web-dev-sdk (actual LLM, image gen, TTS).",
        "Other tools return simulated responses (formatted previews of what would be produced).",
        "",
        "Tool names follow the pattern: <category_id>_<action> (e.g. 'characters_generate_hero', 'city_build_metro_station').",
      ].join("\n"),
    },
  );

  // --- tools/list ---
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        // Meta-tools first (so Claude sees them immediately)
        ...metaTools,
        // Then all regular tools with rich descriptions
        ...allTools.map((t) => ({
          name: t.name,
          description: buildToolDescription(t),
          inputSchema: inputsToJsonSchema(t.inputs),
        })),
      ],
    };
  });

  // --- tools/call ---
  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const { name, arguments: args } = request.params;
    const result = await executeTool(name, args || {});
    const content: any[] = [{ type: "text", text: result.text }];
    if (result.imageBase64) {
      content.push({
        type: "image",
        data: result.imageBase64,
        mimeType: "image/png",
      });
    }
    if (result.audioBase64) {
      content.push({
        type: "audio",
        data: result.audioBase64,
        mimeType: "audio/mpeg",
      });
    }
    return { content };
  });

  return server;
}

/* ------------------------------------------------------------------ */
/* Main                                                                 */
/* ------------------------------------------------------------------ */

const isStdio = process.argv.includes("--stdio");

log(`WorldForge MCP Server v2.0 starting...`);
log(`Total tools: ${allTools.length} + 5 meta-tools across ${allCategories.length} categories`);
log(`Real SDK handlers: ${allTools.filter((t) => hasRealHandler(t.name)).length}`);

if (isStdio) {
  log("Mode: stdio (Claude Code / Claude Desktop compatible)");
  const transport = new StdioServerTransport();
  const server = buildServer();
  await server.connect(transport);
  log("MCP server connected via stdio, ready for tool calls.");
} else {
  log("Mode: HTTP (dev/testing)");
  const PORT = 3030;
  const server = buildServer();

  Bun.serve({
    port: PORT,
    async fetch(req) {
      const url = new URL(req.url);

      // Health/info
      if (url.pathname === "/" || url.pathname === "/health") {
        return new Response(
          JSON.stringify({
            server: "worldforge-mcp",
            version: "2.0.0",
            toolCount: allTools.length,
            metaToolCount: 5,
            categoryCount: allCategories.length,
            realHandlerCount: allTools.filter((t) => hasRealHandler(t.name)).length,
            categories: allCategories.map((c) => ({
              id: c.id,
              name: c.name,
              toolCount: toolsByCategory.get(c.id)?.length || 0,
            })),
            status: "healthy",
            metaTools: metaTools.map((m) => m.name),
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      // List all tools (compact)
      if (url.pathname === "/tools") {
        return new Response(
          JSON.stringify(
            allTools.map((t) => ({
              name: t.name,
              title: t.title,
              description: t.description,
              category: t.category,
              categoryName: t.categoryName,
              tags: t.tags,
              returns: t.returns,
              inputs: t.inputs,
              real: hasRealHandler(t.name),
            })),
          ),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      // List categories
      if (url.pathname === "/categories") {
        return new Response(
          JSON.stringify(
            allCategories.map((c) => ({
              id: c.id,
              name: c.name,
              short: c.short,
              description: c.description,
              icon: c.icon,
              color: c.color,
              accent: c.accent,
              toolCount: toolsByCategory.get(c.id)?.length || 0,
              tools: (toolsByCategory.get(c.id) || []).map((t) => ({
                name: `${c.id}_${t.suffix}`,
                title: t.title,
                description: t.description,
                tags: t.tags,
              })),
            })),
          ),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      // List meta-tools
      if (url.pathname === "/meta-tools") {
        return new Response(
          JSON.stringify(metaTools),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      // Call a tool (POST /call {name, arguments})
      if (url.pathname === "/call" && req.method === "POST") {
        try {
          const body = (await req.json()) as { name: string; arguments?: Record<string, unknown> };
          const result = await executeTool(body.name, body.arguments || {});
          return new Response(
            JSON.stringify({
              result: result.text,
              imageBase64: result.imageBase64 || null,
              audioBase64: result.audioBase64 || null,
              meta: result.meta || null,
              real: hasRealHandler(body.name) || body.name.startsWith("worldforge_"),
            }),
            { headers: { "Content-Type": "application/json" } },
          );
        } catch (e) {
          return new Response(JSON.stringify({ error: String(e) }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      // List which tools have REAL handlers
      if (url.pathname === "/real-tools") {
        const { realHandlers } = await import("./real-handlers.ts");
        return new Response(
          JSON.stringify({ tools: Object.keys(realHandlers) }),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response("Not found", { status: 404 });
    },
  });

  log(`HTTP server listening on http://localhost:${PORT}`);
  log(`  GET  /              — health & info`);
  log(`  GET  /tools          — list all tools (compact)`);
  log(`  GET  /categories     — list categories with tools`);
  log(`  GET  /meta-tools     — list meta-tools`);
  log(`  GET  /real-tools     — list tools with real SDK handlers`);
  log(`  POST /call           — call a tool {name, arguments}`);
}

export { buildServer, executeTool, inputsToJsonSchema, buildToolDescription };
