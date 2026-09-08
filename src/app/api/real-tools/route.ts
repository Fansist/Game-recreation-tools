import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Proxies the MCP server's /real-tools endpoint (list of SDK-backed tools). */
export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch("http://localhost:3030/real-tools", {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return NextResponse.json({ tools: [] }, { status: 200 });
    }
    const data = await res.json();
    return NextResponse.json(
      { tools: data.tools || [] },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json({ tools: [] }, { status: 200 });
  }
}
