import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";

// AGENT READINESS PROXY (step 255.B1) — the dev console's "is this agent alive and signed in?" check.
// Proxies the ReadinessMcpServer (127.0.0.1:3216, bridges/platforms) tool
// `owner_coding_agents_check_readiness` → per-agent facts {platform, installed, logged_in, busy,
// last_worked_*} — no tokens spent, no agent woken. The browser cannot reach :3216 (localhost-bound),
// hence this same-origin proxy.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const secret = process.env.HERMES_MCP_SECRET ?? process.env.MCP_SECRET;
    const r = await fetch("http://127.0.0.1:3216/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "owner_coding_agents_check_readiness", arguments: {} },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return NextResponse.json({ error: `readiness ${r.status}` }, { status: 502 });
    const d = (await r.json()) as { result?: { content?: { text?: string }[] } };
    const text = d.result?.content?.[0]?.text ?? "{}";
    let agents: unknown;
    try { agents = JSON.parse(text); } catch { agents = text; }
    return NextResponse.json({ ok: true, agents });
  } catch (e) {
    return NextResponse.json({ error: `readiness unreachable: ${e}` }, { status: 502 });
  }
}
