import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject, syncIndexFromFiles, listNodes, readNodeFiles } from "@/lib/nodes";

// The live canvas index (step 224 L3) — GET ?automation=<category>/<slug> returns the lightweight node
// list the Builder canvas renders (cuid, name, draft, position, versions). It seeds the index from the
// files first (so pre-existing folder nodes appear) and never loads the heavy version snapshots. The
// canvas unions this with the build-time DIAGRAM_NODES prop by cuid, so a just-created draft shows without
// a rebuild while materialized nodes come from the built file.
export const runtime = "nodejs";

// A node's instruction.ts exports INSTRUCTION as a string literal — a backtick template (the co-located
// standard, e.g. the reference example), a double- or single-quoted string (what the Builder writes back).
// Read whichever form is there so the panel never shows an empty instruction for a materialized node.
function parseInstruction(src: string): string {
  const backtick = src.match(/INSTRUCTION\s*=\s*`((?:[^`\\]|\\.)*)`/);
  if (backtick) return backtick[1].replace(/\\`/g, "`").replace(/\\\$/g, "$");
  const quoted = src.match(/INSTRUCTION\s*=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/);
  if (!quoted) return "";
  const raw = quoted[1];
  try {
    return JSON.parse(raw.startsWith("'") ? `"${raw.slice(1, -1).replace(/"/g, '\\"')}"` : raw) as string;
  } catch {
    return raw.slice(1, -1);
  }
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const automation = (req.nextUrl.searchParams.get("automation") ?? "").trim();
  const proj = resolveProject(automation);
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  await syncIndexFromFiles(proj.automation, proj.projectDir);
  const nodes = await listNodes(proj.automation);

  // The Builder panel also needs each node's editable text — a draft's spec.md, a materialized node's
  // instruction.ts. Small (the panel edits them); the heavy version snapshots are never included.
  if (req.nextUrl.searchParams.get("withSources") === "1") {
    const sources: Record<string, { spec: string; instruction: string }> = {};
    for (const n of nodes) {
      const f = await readNodeFiles(proj.projectDir, n.slug);
      sources[n.cuid] = { spec: f.spec, instruction: parseInstruction(f.instruction) };
    }
    return NextResponse.json({ nodes, sources });
  }
  return NextResponse.json({ nodes });
}
