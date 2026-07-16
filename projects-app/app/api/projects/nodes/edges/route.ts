import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorize, resolveProject } from "@/lib/nodes";

// DIAGRAM EDGE operations (owner 2026-07-16, the fan-in fix) — edges are their own many-to-many list
// (automation_diagram_edges), NOT the node's single parent: a node takes any number of incoming and
// outgoing edges (two input channels converging on one dashboard output is normal). DELIBERATELY NO
// validation logic beyond self-loop and duplicates (the owner's explicit ruling: no "can this connect?"
// checks). POST {automation, fromCuid, toCuid} connects; {…, remove:true} disconnects.
//
// parent_cuid is kept as a LAYOUT hint only: a connect stamps it on a target that has no parent yet (so the
// tree layout places the node), and a remove clears it only when it pointed at this exact edge's source.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as {
    automation?: string; fromCuid?: string; toCuid?: string; remove?: boolean;
  };
  const proj = resolveProject(String(body.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const from = String(body.fromCuid ?? "");
  const to = String(body.toCuid ?? "");
  if (!from || !to) return NextResponse.json({ error: "fromCuid and toCuid required" }, { status: 400 });
  if (from === to) return NextResponse.json({ error: "a node cannot link to itself" }, { status: 400 });

  if (body.remove) {
    await db.prepare(
      `DELETE FROM automation_diagram_edges WHERE automation = ? AND from_cuid = ? AND to_cuid = ?`,
    ).run(proj.automation, from, to);
    await db.prepare(
      `UPDATE automation_nodes SET parent_cuid = NULL, updated_at = datetime('now')
       WHERE cuid = ? AND parent_cuid = ?`,
    ).run(to, from);
    return NextResponse.json({ ok: true, removed: true });
  }

  await db.prepare(
    `INSERT OR IGNORE INTO automation_diagram_edges (automation, from_cuid, to_cuid) VALUES (?, ?, ?)`,
  ).run(proj.automation, from, to);
  await db.prepare(
    `UPDATE automation_nodes SET parent_cuid = ?, updated_at = datetime('now')
     WHERE cuid = ? AND parent_cuid IS NULL`,
  ).run(from, to);
  return NextResponse.json({ ok: true });
}
