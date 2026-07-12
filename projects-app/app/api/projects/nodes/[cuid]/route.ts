import { NextRequest, NextResponse } from "next/server";
import { writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import { authorize, resolveProject, regenerateDiagram, liveSlugsInOrder, type NodeRow } from "@/lib/nodes";

// Edit or delete a node (step 224 L3). PATCH writes the panel edits to the co-located files: spec.md (a
// draft's brief) and/or instruction.ts (a materialized node's system instruction — editing it is what turns
// a live node into an optimization target in L6), and the display name into the index. DELETE is a soft
// delete: the index row is tombstoned (status='removed'), the folder is removed, and _data/diagram.ts is
// regenerated from the survivors (co-location invariant preserved).
export const runtime = "nodejs";

async function nodeByCuid(cuid: string): Promise<NodeRow | undefined> {
  return (await db.prepare(`SELECT * FROM automation_nodes WHERE cuid = ?`).get(cuid)) as NodeRow | undefined;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ cuid: string }> }) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { cuid } = await ctx.params;
  const row = await nodeByCuid(cuid);
  if (!row) return NextResponse.json({ error: "node not found" }, { status: 404 });
  const proj = resolveProject(row.automation);
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as { spec?: string; instruction?: string; name?: string };
  const nodeDir = join(proj.projectDir, "_nodes", row.slug);

  if (typeof body.spec === "string") {
    await writeFile(join(nodeDir, "spec.md"), `${body.spec.trim()}\n`, "utf8");
  }
  if (typeof body.instruction === "string") {
    await writeFile(join(nodeDir, "instruction.ts"), `export const INSTRUCTION = ${JSON.stringify(body.instruction)};\n`, "utf8");
  }
  if (typeof body.name === "string" && body.name.trim()) {
    await db.prepare(`UPDATE automation_nodes SET name = ?, updated_at = datetime('now') WHERE cuid = ?`).run(body.name.trim(), cuid);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ cuid: string }> }) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { cuid } = await ctx.params;
  const row = await nodeByCuid(cuid);
  if (!row) return NextResponse.json({ error: "node not found" }, { status: 404 });
  const proj = resolveProject(row.automation);
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  await db.prepare(`UPDATE automation_nodes SET status = 'removed', updated_at = datetime('now') WHERE cuid = ?`).run(cuid);
  await rm(join(proj.projectDir, "_nodes", row.slug), { recursive: true, force: true });
  await regenerateDiagram(proj.projectDir, await liveSlugsInOrder(row.automation));
  return NextResponse.json({ ok: true });
}
