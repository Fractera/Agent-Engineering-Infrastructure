import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { deleteRow, patchRow } from "@/lib/dashboard-rows";

// One live dashboard row (step 229): DELETE removes it; PATCH merges new values into it. Only LIVE rows have
// an id here — the config's seed rows are read-only demo (the UI never sends their ids to this route).
export const runtime = "nodejs";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await authorize(_req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const ok = await deleteRow(id);
  if (!ok) return NextResponse.json({ error: "row not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { values?: Record<string, unknown> } | null;
  const values = body?.values && typeof body.values === "object" ? body.values : {};
  const ok = await patchRow(id, values);
  if (!ok) return NextResponse.json({ error: "row not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
