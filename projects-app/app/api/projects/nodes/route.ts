import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject, syncIndexFromFiles, listNodes, readNodeFiles, readNodePorts } from "@/lib/nodes";

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
  // ?withPorts=1 (step 225 G5) — the typed inputs/outputs of every node. An AGENT wiring the workspace needs
  // this to choose a link's endpoints by CONTRACT (which output can feed which input), not by guessing.
  if (req.nextUrl.searchParams.get("withPorts") === "1") {
    const ports: Record<string, { in: string[]; out: string[] }> = {};
    for (const n of nodes) ports[n.cuid] = await readNodePorts(proj.projectDir, n.slug);
    return NextResponse.json({ nodes, ports });
  }

  if (req.nextUrl.searchParams.get("withSources") === "1") {
    // role/ioType ride along (owner 2026-07-16, the Builder type editor): the LIVE values from each node's
    // meta.ts — the canvas must reflect a just-changed draft type instantly, without waiting for a rebuild
    // of the build-time DIAGRAM_NODES prop.
    const sources: Record<string, { spec: string; instruction: string; role?: string; ioType?: string }> = {};
    for (const n of nodes) {
      const f = await readNodeFiles(proj.projectDir, n.slug);
      sources[n.cuid] = {
        spec: f.spec,
        instruction: parseInstruction(f.instruction),
        role: (f.meta.match(/\brole\s*:\s*["']([^"']+)["']/) ?? [])[1],
        ioType: (f.meta.match(/\bioType\s*:\s*["']([^"']+)["']/) ?? [])[1],
      };
    }
    return NextResponse.json({ nodes, sources });
  }
  return NextResponse.json({ nodes });
}
