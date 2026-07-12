import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createNodeId } from "@/lib/cuid";
import { draftNodeStubFiles } from "@/app/(projects)/projects/_lib/draft-node-stub";
import { db } from "@/lib/db";
import {
  authorize, resolveProject, syncIndexFromFiles, nextOrd, uniqueSlug, regenerateDiagram, liveSlugsInOrder,
} from "@/lib/nodes";

// Create a DRAFT node (step 224 L3). Generates a CUID, writes the co-located draft stub files
// (meta draft:true + empty functions.ts + spec.md), inserts the live index row, and regenerates
// _data/diagram.ts so the new folder is referenced (keeps the 223.C.5 co-location invariant). NO build —
// the canvas reads the index, so the draft appears instantly; the build follows at materialize time.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as
    | { automation?: string; name?: string; spec?: string; parentCuid?: string }
    | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  const name = String(body?.name ?? "").trim() || "New node";
  const spec = String(body?.spec ?? "").trim() || "Describe how this node should work and what result it brings.";
  const parentCuid = body?.parentCuid ? String(body.parentCuid) : null;

  await syncIndexFromFiles(proj.automation, proj.projectDir);
  const slug = await uniqueSlug(name, proj.projectDir);
  const cuid = createNodeId();

  // A child is inserted RIGHT AFTER its parent (not appended at the end) so the order in _data/diagram.ts
  // follows the tree — the owner adds a node UNDER the node they clicked (fixed in L4.1). Without a parent
  // the node is a root and goes last.
  let ord: number;
  if (parentCuid) {
    const p = (await db.prepare(`SELECT ord FROM automation_nodes WHERE cuid = ?`).get(parentCuid)) as { ord: number } | undefined;
    if (p) {
      ord = p.ord + 1;
      await db.prepare(
        `UPDATE automation_nodes SET ord = ord + 1 WHERE automation = ? AND ord >= ? AND status != 'removed'`,
      ).run(proj.automation, ord);
    } else {
      ord = await nextOrd(proj.automation);
    }
  } else {
    ord = await nextOrd(proj.automation);
  }

  const nodeDir = join(proj.projectDir, "_nodes", slug);
  await mkdir(nodeDir, { recursive: true });
  for (const [rel, content] of Object.entries(draftNodeStubFiles({ cuid, slug, name, spec }))) {
    await writeFile(join(nodeDir, rel), content, "utf8");
  }

  await db.prepare(
    `INSERT INTO automation_nodes
     (cuid, automation, slug, name, parent_cuid, ord, draft, active_version, latest_version, status)
     VALUES (?, ?, ?, ?, ?, ?, 1, 0, 0, 'draft')`,
  ).run(cuid, proj.automation, slug, name, parentCuid, ord);

  await regenerateDiagram(proj.projectDir, await liveSlugsInOrder(proj.automation));
  return NextResponse.json({ ok: true, cuid, slug, name, automation: proj.automation, draft: true });
}
