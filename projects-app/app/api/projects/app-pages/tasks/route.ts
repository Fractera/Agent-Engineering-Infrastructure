import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { readMeta, addTask, clearTasks, taskClientId } from "@/lib/app-pages/readme";

// PER-PAGE TO-DOS (step 242) — the declared page's own to-do list, stored inside its README.md (no DB), same
// write path for the human UI and a coding agent. Mirrors the service page's `tasks` route, but KEYED BY THE
// FILESYSTEM REL PATH (`?rel=`), so a multilingual page under [lang] is addressed unambiguously. Voice-typed
// and AI-brainstormed to-dos both land here.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rel = (req.nextUrl.searchParams.get("rel") ?? "").trim();
  if (!rel) return NextResponse.json({ error: "rel is required" }, { status: 400 });
  const meta = await readMeta(rel);
  const tasks = (meta?.tasks ?? []).map((t) => ({ id: taskClientId(rel, t.id), body: t.body }));
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { rel?: string; body?: string } | null;
  const rel = String(body?.rel ?? "").trim();
  const text = String(body?.body ?? "").trim();
  if (!rel || !text) return NextResponse.json({ error: "rel and body are required" }, { status: 400 });
  const t = await addTask(rel, text);
  return NextResponse.json({ task: { id: taskClientId(rel, t.id), body: t.body } }, { status: 201 });
}

// Discard ALL open to-dos for a page.
export async function DELETE(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rel = (req.nextUrl.searchParams.get("rel") ?? "").trim();
  if (!rel) return NextResponse.json({ error: "rel is required" }, { status: 400 });
  await clearTasks(rel);
  return NextResponse.json({ ok: true });
}
