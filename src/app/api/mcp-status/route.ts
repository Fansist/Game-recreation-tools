import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Proxies the WorldForge MCP server's health endpoint.
 * Returns { online, toolCount, categoryCount, server, version }.
 *
 * The MCP server runs on port 3030 in the dev sandbox. We proxy through
 * a Next.js route handler so the browser doesn't hit CORS issues.
 */
export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch("http://localhost:3030/", {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        {
          online: false,
          toolCount: null,
          categoryCount: null,
          error: `MCP server returned HTTP ${res.status}`,
        },
        { status: 200 },
      );
    }

    const data = await res.json();
    return NextResponse.json(
      {
        online: true,
        toolCount: data.toolCount ?? null,
        categoryCount: data.categoryCount ?? null,
        server: data.server,
        version: data.version,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (e) {
    return NextResponse.json(
      {
        online: false,
        toolCount: null,
        categoryCount: null,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 200 },
    );
  }
}
