import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";

// Carousel auth indicator (step 98). Surfaces the SAME readiness probe Hermes
// uses (readiness-mcp-server.js on loopback :3216) to the admin UI, so the
// carousel can paint a code-platform button red ("session running but the
// agent is NOT logged into its subscription"). The probe is deterministic
// (`claude auth status` + cached-credential files) — not the agent/AI — so a
// plain function gets byte-identical results to what the MCP returns.
//
// We only READ the existing MCP; the readiness server stays untouched (step 92
// contract). MCP_SECRET is sent only when set — the loopback server skips auth
// when it runs with secret=null. → next-step ШАГ 98.

const READINESS_URL =
  `http://127.0.0.1:${process.env.READINESS_MCP_PORT ?? 3216}`;
const MCP_SECRET = process.env.MCP_SECRET ?? "";

type AgentReadiness = {
  platform: string;
  installed: boolean;
  logged_in: boolean;
  busy: boolean | null;
};

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (MCP_SECRET) headers["Authorization"] = `Bearer ${MCP_SECRET}`;
    const res = await fetch(READINESS_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "check_agents_readiness", arguments: {} },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      // Readiness bridge unreachable → report unknown, never a hard error. The
      // UI treats unknown as "don't show red" (no false alarm).
      return NextResponse.json({ agents: [], available: false });
    }
    const data = await res.json();
    const text = data?.result?.content?.[0]?.text;
    const parsed = text ? JSON.parse(text) : null;
    const agents: AgentReadiness[] = Array.isArray(parsed?.agents) ? parsed.agents : [];
    return NextResponse.json({ agents, available: true });
  } catch {
    return NextResponse.json({ agents: [], available: false });
  }
}
