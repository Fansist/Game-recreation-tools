import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Proxies a tool call to the WorldForge MCP server.
 * Body: { name: string, arguments: Record<string, unknown> }
 *
 * Returns { ok, result, error }.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, arguments: args } = body ?? {};

    if (typeof name !== "string" || !name) {
      return NextResponse.json(
        { ok: false, error: "Missing 'name' field" },
        { status: 400 },
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    const res = await fetch("http://localhost:3030/call", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, arguments: args ?? {} }),
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `MCP server returned HTTP ${res.status}: ${text}` },
        { status: 200 },
      );
    }

    const data = await res.json();
    return NextResponse.json(
      {
        ok: true,
        result: data.result,
        imageBase64: data.imageBase64 || null,
        audioBase64: data.audioBase64 || null,
        meta: data.meta || null,
        real: data.real === true,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 200 },
    );
  }
}
