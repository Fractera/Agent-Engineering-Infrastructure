import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { requireAuth } from "@/lib/require-auth";

const run = promisify(execFile);

// Agentic RAG on/off (step 500). The owner's rule: the installer ALWAYS puts
// LightRAG on the server, and the architect decides whether the project uses it.
// "Uses it" means exactly one thing here — whether the fractera-rag process is
// running — because that is what every other surface already keys off (the panel
// header, /api/rag/status, the ingest and query routes). A second, softer notion
// of "enabled" stored somewhere else would be a second source of truth about the
// same fact, and the two would drift.
//
// Stopping it also returns its memory, which is the honest reason an architect
// would turn it off on a small VPS.
export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let on: unknown;
  try { ({ on } = await req.json()); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  if (typeof on !== "boolean") return NextResponse.json({ error: "`on` must be a boolean" }, { status: 400 });

  try {
    // `pm2 start <name>` resurrects a stopped process by name; it does not create
    // a second one. If the process was never registered (a server installed before
    // this step), start fails and we say so instead of pretending it toggled.
    await run("pm2", [on ? "start" : "stop", "fractera-rag"], { timeout: 30_000 });
  } catch (e) {
    const msg = String((e as { stderr?: string; message?: string }).stderr ?? (e as Error).message ?? e);
    return NextResponse.json({ error: msg.slice(0, 400) }, { status: 500 });
  }

  // Report the state we can actually observe, not the state we asked for.
  if (!on) return NextResponse.json({ ok: true, running: false });
  const RAG_URL = process.env.LIGHTRAG_URL ?? "http://localhost:9621";
  const RAG_KEY = process.env.LIGHTRAG_API_KEY ?? "";
  for (let i = 0; i < 8; i++) {
    try {
      const r = await fetch(`${RAG_URL}/health`, { headers: { "X-API-Key": RAG_KEY }, signal: AbortSignal.timeout(2000) });
      if (r.ok) return NextResponse.json({ ok: true, running: true });
    } catch { /* still coming up */ }
    await new Promise((res) => setTimeout(res, 2000));
  }
  return NextResponse.json({ ok: true, running: false, note: "process started but did not answer /health in time" });
}
