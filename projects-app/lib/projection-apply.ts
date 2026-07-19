import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { compileNode } from "@/lib/node-compile";
import { analyzeGraphFlow } from "@/lib/graph-flow";
import { regenerateDiagram, liveSlugsInOrder, resolveProject, syncNodeNamesFromMeta } from "@/lib/nodes";

// THE GATED APPLY (step 254.14, ROUTE-V3 law 4) — the return path from the agent's sterile room. NEVER a
// merge: the room's diff against the route is computed, every change passes the gates, and only then the
// whole diff lands ATOMICALLY (backup → copy → rollback on any error). Refusals TEACH (they name the
// violated law and the allowed alternative) — the step-250 lesson: a refusal the model cannot learn from
// just burns its turns.
//
// THE GATES:
//   A. The authorship whitelist — what an agent MAY author: node sources, _data declarations, its own
//      _lib/_types, its api routes, its pages, README.md, cron.json. The five law documents are
//      platform-authored and IMMUTABLE; *.compiled.mjs is runtime truth (the step-251 lesson).
//   B. Node compilation IN THE ROOM — a changed node must bundle before anything is applied.
//   C. DESIGN + DATA FLOW (263.1, after automation-48qwh): adding a NEW node requires the TARGET-GRAPH.md
//      design artifact in the room (design before code — weak models fill forms better than they reason
//      freely), and the room's whole graph must pass the data-flow gate (no starved nodes, no dead ends —
//      lib/graph-flow.ts). Structural validation alone happily accepted a meaningless two-node island.
//   Deletions are IGNORED (reported): removing an object goes through the delete APIs, never via a
//   missing file in a room.

const LAW_DOCS = new Set(["AGENTS.md", "CLAUDE.md", "WIRING-RULES.md", "SCALE-RULES.md", "PLATFORM.md"]);

const ALLOWED = [
  /^_nodes\/[a-z0-9-]+\/(meta\.ts|functions\.ts|instruction\.ts|spec\.md)$/,
  /^_data\/[a-z0-9-]+\.(ts|md|json)$/,
  /^_lib\/.+\.(ts|tsx)$/,
  /^_types\/.+\.ts$/,
  /^api\/.+\/route\.ts$/,
  /^pages\/.+$/,
  /^README\.md$/,
  /^cron\.json$/,
  /^TARGET-GRAPH\.md$/, // the design artifact (gate C) — authored by the agent BEFORE any node code
];

export type ApplyResult =
  | { ok: true; applied: string[]; recompiled: string[]; ignoredDeletions: string[] }
  | { ok: false; error: string; violations?: string[] };

async function walk(dir: string): Promise<string[]> {
  let out: string[] = [];
  let entries: string[] = [];
  try { entries = await readdir(dir); } catch { return out; }
  for (const name of entries) {
    const p = join(dir, name);
    if ((await stat(p)).isDirectory()) out = out.concat(await walk(p));
    else out.push(p);
  }
  return out;
}

export async function applyProjection(automation: string): Promise<ApplyResult> {
  const proj = resolveProject(automation);
  if (!proj.ok) return { ok: false, error: proj.error };
  const room = join(process.cwd(), "..", "agent-rooms", proj.category, proj.slug);
  try { await stat(room); } catch {
    return { ok: false, error: `no agent room exists for ${proj.automation} — build the projection first (POST /api/projects/projection)` };
  }

  // The diff: room files whose content differs from (or is missing in) the route.
  const roomFiles = (await walk(room)).map((f) => relative(room, f).split(sep).join("/"))
    .filter((f) => !f.endsWith(".compiled.mjs"));
  const changed: string[] = [];
  for (const rel of roomFiles) {
    const a = await readFile(join(room, rel)).catch(() => null);
    const b = await readFile(join(proj.projectDir, rel)).catch(() => null);
    if (a && (!b || !a.equals(b))) changed.push(rel);
  }
  // Deletions (a route file inside the projected dirs that vanished from the room) — ignored, reported.
  const routeFiles = (await walk(proj.projectDir)).map((f) => relative(proj.projectDir, f).split(sep).join("/"));
  const projected = new Set(roomFiles);
  const ignoredDeletions = routeFiles.filter((f) =>
    !projected.has(f) && !f.endsWith(".compiled.mjs") &&
    (f.startsWith("_nodes/") || f.startsWith("_data/") || f.startsWith("_lib/") || f.startsWith("_types/") || f.startsWith("api/") || f.startsWith("pages/")),
  );

  if (!changed.length) return { ok: true, applied: [], recompiled: [], ignoredDeletions };

  // GATE A — the authorship whitelist. One violation refuses the WHOLE diff (atomicity of intent).
  const violations: string[] = [];
  for (const rel of changed) {
    if (LAW_DOCS.has(rel)) {
      violations.push(`${rel}: the law documents are platform-authored and IMMUTABLE — your changes to them are never applied. Put automation-specific notes in README.md instead.`);
      continue;
    }
    if (!ALLOWED.some((re) => re.test(rel))) {
      violations.push(`${rel}: outside the authorship whitelist (node sources, _data, _lib, _types, api/**/route.ts, pages/**, README.md, cron.json). If this file belongs to the cockpit or the platform, it is not yours to change.`);
    }
  }

  // GATE A2 — A ROLE IS FOR LIFE (owner's law 2026-07-19, WIRING-RULES §1/§5): an EXISTING node's role
  // and ioType are immutable. Born from a real mutation: while "adding a Telegram channel" an agent
  // shifted the live control-panel input aside and repurposed it — prose alone did not stop it, so the
  // gate does. New nodes (no route-side meta yet) are free to declare anything.
  const identity = (src: string) => ({
    role: src.match(/role:\s*["']([^"']+)["']/)?.[1],
    ioType: src.match(/ioType:\s*["']([^"']+)["']/)?.[1],
  });
  for (const rel of changed) {
    const m = rel.match(/^_nodes\/([^/]+)\/meta\.ts$/);
    if (!m) continue;
    const before = await readFile(join(proj.projectDir, rel), "utf8").catch(() => null);
    if (before === null) continue; // a NEW node — its identity is being born, not changed
    const after = await readFile(join(room, rel), "utf8").catch(() => "");
    const was = identity(before);
    const now = identity(after);
    if (was.role && now.role && was.role !== now.role) {
      violations.push(`${rel}: an existing node's role is FOR LIFE ("${was.role}" → "${now.role}" is forbidden). Need a different role at this spot? Create a NEW node with the right role, wire it in, and remove the obsolete node through the platform DELETE API — never by retyping.`);
    }
    if (was.ioType && now.ioType && was.ioType !== now.ioType) {
      violations.push(`${rel}: an existing node's ioType is FOR LIFE ("${was.ioType}" → "${now.ioType}" is forbidden). A new channel enters through a NEW input node that joins the existing midstream (WIRING-RULES law 5) — it never repurposes another surface's node.`);
    }
  }
  if (violations.length) return { ok: false, error: "the diff was refused — fix the violations and re-apply (nothing was changed)", violations };

  // GATE B — changed nodes must compile IN THE ROOM before anything lands.
  const touchedSlugs = [...new Set(changed.filter((f) => f.startsWith("_nodes/")).map((f) => f.split("/")[1]))];
  for (const slug of touchedSlugs) {
    const res = await compileNode(room, slug);
    if (!res.ok) {
      return { ok: false, error: `node "${slug}" does not compile — nothing was applied. Fix the source in the room and re-apply:\n${res.error}` };
    }
    await rm(join(room, "_nodes", slug, "functions.compiled.mjs"), { force: true }); // a gate artifact, not authored
  }

  // GATE C1 — DESIGN BEFORE CODE (263.1): a diff that ADDS a node must carry the TARGET-GRAPH.md design
  // artifact (in this diff or already applied earlier). Weak models skip optional prose — a required
  // deliverable they do not skip.
  const addsNewNode = await (async () => {
    for (const rel of changed) {
      const m = rel.match(/^_nodes\/([^/]+)\/meta\.ts$/);
      if (m && (await readFile(join(proj.projectDir, rel)).catch(() => null)) === null) return true;
    }
    return false;
  })();
  if (addsNewNode) {
    const hasPlan = changed.includes("TARGET-GRAPH.md")
      || (await stat(join(proj.projectDir, "TARGET-GRAPH.md")).then(() => true).catch(() => false));
    if (!hasPlan) {
      return {
        ok: false,
        error:
          "the diff adds a new node but carries no TARGET-GRAPH.md — design before code (nothing was applied). " +
          "Write TARGET-GRAPH.md at the room root FIRST: a table of every node (role, ioType, in/out keys), every " +
          "edge, the full input→…→output paths recited per surface, and the fate of every EXISTING node " +
          "(kept / reoriented / deleted — with the reason). Then re-apply with your nodes.",
      };
    }
  }

  // GATE C2 — THE DATA-FLOW GATE (263.1, lib/graph-flow.ts): the room IS the future state of the route,
  // so its whole graph must be sound — no starved nodes, no dead ends. The automation-48qwh failure
  // (an unfed, unread two-node island) passed every structural check; this is the check it could not pass.
  const flowViolations = await analyzeGraphFlow(join(room, "_nodes"));
  if (flowViolations.length) {
    return {
      ok: false,
      error: "the diff was refused — the resulting graph does not hold water (nothing was applied). Fix the flow in the room and re-apply.",
      violations: flowViolations,
    };
  }

  // APPLY — atomic: back up every target, copy, roll back everything on any failure.
  const backups = new Map<string, Buffer | null>();
  try {
    for (const rel of changed) {
      const dest = join(proj.projectDir, rel);
      backups.set(rel, await readFile(dest).catch(() => null));
      await mkdir(dirname(dest), { recursive: true });
      await copyFile(join(room, rel), dest);
    }
  } catch (e) {
    for (const [rel, buf] of backups) {
      const dest = join(proj.projectDir, rel);
      if (buf) await writeFile(dest, buf).catch(() => { /* best-effort rollback */ });
      else await rm(dest, { force: true }).catch(() => { /* best-effort rollback */ });
    }
    return { ok: false, error: `apply failed and was rolled back: ${e}` };
  }

  // AFTER — refresh the runtime artifacts of the touched nodes and the generated diagram.
  const recompiled: string[] = [];
  for (const slug of touchedSlugs) {
    const res = await compileNode(proj.projectDir, slug);
    if (res.ok) recompiled.push(slug);
  }
  if (touchedSlugs.length) {
    await regenerateDiagram(proj.projectDir, await liveSlugsInOrder(proj.automation)).catch(() => { /* diagram regen is best-effort here */ });
    // The canvas reads DB rows, not meta.ts — an applied rename must reach it (the two-truths seam).
    await syncNodeNamesFromMeta(proj.automation, proj.projectDir).catch(() => { /* best-effort */ });
  }
  return { ok: true, applied: changed, recompiled, ignoredDeletions };
}
