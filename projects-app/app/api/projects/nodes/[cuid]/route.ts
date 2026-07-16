import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import { authorize, resolveProject, regenerateDiagram, liveSlugsInOrder, type NodeRow } from "@/lib/nodes";
import { setTransport } from "@/lib/entity-store";

// Insert or replace one simple string field of a meta.ts source (role / ioType / parentId — the owner's
// Builder type editor, 2026-07-16). value === null removes the field. The field is placed right after the
// `name:` line when absent, so the file stays a hand-formatted literal like every authored meta.ts.
function upsertMetaField(src: string, key: string, value: string | null): string {
  const line = new RegExp(`^\\s*${key}:\\s*["'][^"']*["'],?\\s*\\n`, "m");
  if (value === null) return src.replace(line, "");
  const rendered = `  ${key}: ${JSON.stringify(value)},\n`;
  if (line.test(src)) return src.replace(line, rendered);
  return src.replace(/^(\s*name:\s*["'][^"']*["'],?\s*\n)/m, `$1${rendered}`);
}

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
  const body = (await req.json().catch(() => ({}))) as {
    spec?: string; instruction?: string; name?: string;
    /** The Builder type editor (owner 2026-07-16): a draft's role and its per-role type (ioType — for an
     *  intermediate node "transform" | "condition" | custom; for input/output a channel/surface key or a
     *  custom name like "WhatsApp"). Written into the node's own meta.ts, the authored home of both. */
    role?: string; ioType?: string;
    /** Edge mode (owner 2026-07-16): rewire this node's PARENT — the diagram edge parent→node. A string
     *  cuid connects, an explicit null disconnects (deletes the edge). Live truth = the index column;
     *  meta.ts parentId is kept in sync as the seed-time fallback. */
    parentCuid?: string | null;
  };
  const nodeDir = join(proj.projectDir, "_nodes", row.slug);

  if (typeof body.role === "string" || typeof body.ioType === "string") {
    const metaPath = join(nodeDir, "meta.ts");
    let meta = await readFile(metaPath, "utf8").catch(() => "");
    if (meta) {
      if (typeof body.role === "string" && body.role.trim()) meta = upsertMetaField(meta, "role", body.role.trim());
      if (typeof body.ioType === "string") meta = upsertMetaField(meta, "ioType", body.ioType.trim() || null);
      await writeFile(metaPath, meta, "utf8");
    }
  }
  if (body.parentCuid !== undefined) {
    // No self-loops, no unknown parents; null = disconnect. Cycle safety: the layout walker is already
    // cycle-guarded, and a cycle can only arise from deliberate misuse of edge mode — still, refuse the
    // trivial self-parent here.
    const parentCuid = body.parentCuid === null ? null : String(body.parentCuid);
    if (parentCuid === cuid) return NextResponse.json({ error: "a node cannot be its own parent" }, { status: 400 });
    let parentSlug: string | null = null;
    if (parentCuid) {
      const p = await nodeByCuid(parentCuid);
      if (!p || p.automation !== row.automation || p.status === "removed") {
        return NextResponse.json({ error: "parent node not found in this automation" }, { status: 400 });
      }
      parentSlug = p.slug;
    }
    await db.prepare(`UPDATE automation_nodes SET parent_cuid = ?, updated_at = datetime('now') WHERE cuid = ?`).run(parentCuid, cuid);
    const metaPath = join(nodeDir, "meta.ts");
    const meta = await readFile(metaPath, "utf8").catch(() => "");
    if (meta) await writeFile(metaPath, upsertMetaField(meta, "parentId", parentSlug), "utf8");
  }

  if (typeof body.spec === "string") {
    await writeFile(join(nodeDir, "spec.md"), `${body.spec.trim()}\n`, "utf8");
  }
  if (typeof body.instruction === "string") {
    await writeFile(join(nodeDir, "instruction.ts"), `export const INSTRUCTION = ${JSON.stringify(body.instruction)};\n`, "utf8");
    // STEP 240 — editing a LIVE node's system instruction is an OPTIMIZATION request, and it used to be
    // dispatched by that panel's own "Start development" button. The wave replaces every per-entity button,
    // so the edit must STAGE itself instead: a draft node is already pending (its spec.md IS the task), but a
    // materialized node has nothing pending — so the new instruction goes into the node's transport slot, and
    // the extractor surfaces it as this node's currentTask. Without this the wave would silently drop node
    // optimizations. The wave's closing call archives + clears it, exactly like every other brief.
    if (row.draft === 0) {
      await setTransport(row.automation, "node", cuid, { instruction: body.instruction, spec: "" });
    }
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
  // Purge the node's diagram edges (owner 2026-07-16) — a deleted node leaves no dangling rows either way.
  await db.prepare(`DELETE FROM automation_diagram_edges WHERE from_cuid = ? OR to_cuid = ?`).run(cuid, cuid);
  await rm(join(proj.projectDir, "_nodes", row.slug), { recursive: true, force: true });
  await regenerateDiagram(proj.projectDir, await liveSlugsInOrder(row.automation));
  return NextResponse.json({ ok: true });
}
