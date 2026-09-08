"use client";

import { useEffect, useState } from "react";

/**
 * Fetches the list of tool names that have REAL SDK handlers registered
 * on the MCP server. Used by the ToolBrowser to badge those tools with
 * a "🟢 REAL" pill so users know which tools actually call z-ai-web-dev-sdk.
 */
export function useRealTools(): { realTools: Set<string>; loading: boolean } {
  const [realTools, setRealTools] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/real-tools", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setRealTools(new Set(data.tools || []));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { realTools, loading };
}
