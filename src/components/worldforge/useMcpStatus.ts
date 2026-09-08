"use client";

import { useEffect, useState } from "react";

export interface McpStatus {
  online: boolean;
  toolCount: number | null;
  categoryCount: number | null;
  loading: boolean;
  lastChecked: number | null;
  error?: string;
}

/**
 * Polls the WorldForge MCP HTTP endpoint (/) for live status.
 * Used by the TopNav status pill and the Stats dashboard.
 *
 * The endpoint lives at /api/mcp-status (a Next.js route handler that
 * proxies to http://localhost:3030/ to avoid CORS issues).
 */
export function useMcpStatus(intervalMs = 30000): McpStatus {
  const [status, setStatus] = useState<McpStatus>({
    online: false,
    toolCount: null,
    categoryCount: null,
    loading: true,
    lastChecked: null,
  });

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch("/api/mcp-status", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setStatus({
          online: !!data.online,
          toolCount: data.toolCount ?? null,
          categoryCount: data.categoryCount ?? null,
          loading: false,
          lastChecked: Date.now(),
          error: undefined,
        });
      } catch (e) {
        if (cancelled) return;
        setStatus((prev) => ({
          ...prev,
          online: false,
          loading: false,
          lastChecked: Date.now(),
          error: e instanceof Error ? e.message : String(e),
        }));
      }
    };

    check();
    const id = setInterval(check, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return status;
}
