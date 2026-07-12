import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { authorize, resolveProject, nodeByCuid } from "@/lib/nodes";
import { materializeNodeStep, nextStepNumber } from "@/lib/dev-steps";

// "Start development" (step 224 L6) — the handoff. Materializes a development step FILE into the existing
// product queue (DEVELOPMENT-STEPS/NEW-STEPS/, read by :3002/service/development-steps — never a new
// mechanism) and returns the copy-paste message for the toast: the owner pastes it into a coder chat, the
// agent executes step #N and closes it by calling materialize, which versions the node.
//
// Fires in TWO cases: a DRAFT node (first build) and a MATERIALIZED node whose system instruction was
// edited (an OPTIMIZATION → version latest+1). This is what turns any live node into a tool for its own
// optimization. Forks/Instances never reach here (parameters + delete only, 223.C.4).
export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ cuid: string }> }) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { cuid } = await ctx.params;
  const row = await nodeByCuid(cuid);
  if (!row) return NextResponse.json({ error: "node not found" }, { status: 404 });
  const proj = resolveProject(row.automation);
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  const nodeDir = join(proj.projectDir, "_nodes", row.slug);
  const optimization = row.draft === 0;
  // A draft hands over its spec.md; a live node hands over its (just edited) instruction.
  const brief = optimization
    ? (await readFile(join(nodeDir, "instruction.ts"), "utf8").catch(() => "")).replace(/^[\s\S]*?INSTRUCTION\s*=\s*[`"']/, "").replace(/[`"'];?\s*$/, "")
    : await readFile(join(nodeDir, "spec.md"), "utf8").catch(() => "");

  const number = await nextStepNumber();
  const { file, message } = await materializeNodeStep({
    number,
    automation: row.automation,
    nodeCuid: cuid,
    nodeSlug: row.slug,
    nodeName: row.name,
    spec: brief,
    optimization,
    targetVersion: row.latest_version + 1,
  });

  return NextResponse.json({ ok: true, number, file, message });
}
