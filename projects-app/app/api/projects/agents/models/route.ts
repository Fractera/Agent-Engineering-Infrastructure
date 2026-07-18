import { NextRequest, NextResponse } from "next/server";
import WebSocket from "ws";
import { authorize } from "@/lib/nodes";

// AGENT MODELS PROXY (step 255.B1) — the dev console's model picker. Asks the platform's PROMPT bridge
// (:3200 Claude / :3202 Codex) for its live model list over a short-lived server-side WebSocket
// ({type:'get_models'} → {type:'models', models:[...]}). Same-origin proxy: the browser talks to us,
// we talk to the localhost bridge.
export const runtime = "nodejs";

const BRIDGE_PORT: Record<string, number> = {
  "claude-code": 3200,
  codex: 3202,
};

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const platform = (req.nextUrl.searchParams.get("platform") ?? "claude-code").trim();
  const port = BRIDGE_PORT[platform];
  if (!port) return NextResponse.json({ error: `unsupported platform "${platform}" (v1: claude-code, codex)` }, { status: 400 });

  try {
    const models = await new Promise<unknown>((resolvePromise, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/`);
      const timer = setTimeout(() => { try { ws.close(); } catch { /* closed */ } reject(new Error("bridge timeout")); }, 8000);
      ws.on("open", () => ws.send(JSON.stringify({ type: "get_models" })));
      ws.on("message", (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString()) as { type?: string; models?: unknown };
          if (msg.type === "models") {
            clearTimeout(timer);
            try { ws.close(); } catch { /* closed */ }
            resolvePromise(msg.models ?? []);
          }
        } catch { /* skip non-JSON frames */ }
      });
      ws.on("error", (e: Error) => { clearTimeout(timer); reject(e); });
    });
    return NextResponse.json({ ok: true, platform, models });
  } catch (e) {
    return NextResponse.json({ error: `models unavailable: ${e}` }, { status: 502 });
  }
}
