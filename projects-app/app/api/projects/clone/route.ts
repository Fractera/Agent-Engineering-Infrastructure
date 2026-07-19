import { NextRequest, NextResponse } from "next/server";
import { cp, readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import {
  authorize, projectsRoot, resolveProject, scheduleRebuild, syncIndexFromFiles,
} from "@/lib/nodes";
import { regenerateExecutables } from "@/lib/executables";
import { createNodeId } from "@/lib/cuid";
import { addCase, listCases, regenerateUseCasesFile } from "@/lib/use-cases";

// CLONE AN AUTOMATION (owner 2026-07-18, the reuse thesis) — a ready automation is a BUILDING BLOCK: the same
// "pull from Telegram → emit an event" flow serves many group automations, differing only by parameters (a
// different channel, different keys). Rather than rebuild an identical automation each time, clone it.
//
// A CLEAN clone: the same NODES / diagram / config / scenarios, but ZERO accumulated runtime data and no
// secrets (a clone starts unconfigured — its env keys derive from its own new slug, so the owner re-enters
// them). It lands in the SAME category, on the global canvas, with the owner's chosen name.
//
// It leans entirely on the co-location invariant: since step 254.10 an automation's whole behaviour lives in
// its folder (nodes with their compiled artefacts, _data, _components, AND its co-located api/ route that
// imports its nodes RELATIVELY). So the copy is a plain recursive folder copy — no slug is embedded in any
// import, nothing to rewrite. The only per-node identity that must change is the cuid in each meta.ts (a
// globally unique id — a duplicate would collide with the source's version history and diagram edges).
export const runtime = "nodejs";

async function exists(p: string): Promise<boolean> {
  try { await stat(p); return true; } catch { return false; }
}

const SLUG_OK = /^[a-z0-9-]+$/;

// Cyrillic → Latin transliteration BEFORE slugifying (owner 2026-07-19): the owner names clones in
// Russian («Телеграм диетолог»), and the old slugify stripped every non-Latin char — the slug collapsed
// to the bare "clone" fallback, an identity that ages badly (clone, clone-2, …). A slug must stay
// recognizably derived from the chosen name.
const CYR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function slugify(s: string): string {
  return s.toLowerCase()
    .replace(/[а-яё]/g, (c) => CYR[c] ?? "")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

/** A slug not yet taken in this category (the automation folder must not exist). The fallback derives
 *  from the SOURCE slug (never a bare "clone") so even an untranslatable name yields a usable identity. */
async function uniqueAutomationSlug(category: string, base: string, sourceSlug: string): Promise<string> {
  const root = slugify(base) || `${sourceSlug}-clone`.slice(0, 48);
  let slug = root;
  let i = 2;
  while (await exists(join(projectsRoot(), category, slug))) slug = `${root}-${i++}`;
  return slug;
}

// The rename route's two title patchers, inlined (they are not exported; keeping them local avoids widening
// that route's surface for a second caller). A clone's display name is the owner's chosen name.
function patchDescriptionTitle(src: string, title: string): string {
  const re = /(export const PROJECT_DESCRIPTION\s*=\s*\{[\s\S]*?\btitle:\s*)"(?:[^"\\]|\\.)*"/;
  return re.test(src) ? src.replace(re, (_m, prefix: string) => prefix + JSON.stringify(title)) : src;
}
function patchReadmeTitle(src: string, title: string): string {
  let out = src;
  const meta = out.match(/<!--\s*fractera:project\s*([\s\S]*?)-->/);
  if (meta) {
    try {
      const obj = JSON.parse(meta[1].trim()) as Record<string, unknown> & { project?: Record<string, unknown> };
      obj.title = title;
      if (obj.project && typeof obj.project === "object") obj.project.title = title;
      out = out.replace(meta[0], `<!-- fractera:project ${JSON.stringify(obj)} -->`);
    } catch { /* corrupt meta — leave it */ }
  }
  return out.replace(/^#\s+.*?(\s+—\s+frozen automation project)/m, `# ${title}$1`);
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string; title?: string } | null;
  const src = resolveProject(String(body?.automation ?? ""));
  if (!src.ok) return NextResponse.json({ error: src.error }, { status: 400 });
  if (!(await exists(src.projectDir))) return NextResponse.json({ error: "source automation not found" }, { status: 404 });

  const title = String(body?.title ?? "").trim().slice(0, 120) || `${src.slug} clone`;
  const cloneSlug = await uniqueAutomationSlug(src.category, title, src.slug);
  const cloneAutomation = `${src.category}/${cloneSlug}`;
  const cloneDir = join(projectsRoot(), src.category, cloneSlug);

  // 1. The folder — everything the automation IS (nodes + compiled artefacts, _data, _components, its own
  //    co-located api/ route with relative imports). One recursive copy; nothing slug-bound to rewrite.
  await cp(src.projectDir, cloneDir, { recursive: true });

  // 2. New cuid per node (identity must be globally unique). meta.ts is the ONLY place a cuid appears by value
  //    (the diagram references nodes by SLUG, parentId is a slug); build the old→new map for the edge copy.
  const cuidMap = new Map<string, string>();
  let nodeSlugs: string[] = [];
  try {
    nodeSlugs = (await readdir(join(cloneDir, "_nodes"), { withFileTypes: true }))
      .filter((e) => e.isDirectory()).map((e) => e.name);
  } catch { /* an automation with no _nodes — nothing to remap */ }
  for (const slug of nodeSlugs) {
    const metaPath = join(cloneDir, "_nodes", slug, "meta.ts");
    const metaSrc = await readFile(metaPath, "utf8").catch(() => "");
    const old = (metaSrc.match(/cuid:\s*["']([^"']+)["']/) ?? [])[1];
    if (!old) continue;
    const fresh = createNodeId();
    cuidMap.set(old, fresh);
    await writeFile(metaPath, metaSrc.replace(/(cuid:\s*["'])[^"']+(["'])/, `$1${fresh}$2`), "utf8");
  }

  // 3. Seed the clone's node index from its files (new cuids) + make its nodes executable under the new slug.
  await syncIndexFromFiles(cloneAutomation, cloneDir);
  await regenerateExecutables().catch(() => { /* the clone folder already exists; a rebuild will retry */ });

  // 4. Diagram edges (the edge truth is the DB, keyed by cuid) — copy the source's, remapped to the new cuids.
  //    Any edge whose endpoint had no cuid to remap is skipped (it could not be drawn anyway).
  try {
    const edges = (await db.prepare(
      `SELECT from_cuid, to_cuid FROM automation_diagram_edges WHERE automation = ?`,
    ).all(src.automation)) as { from_cuid: string; to_cuid: string }[];
    for (const e of edges) {
      const from = cuidMap.get(e.from_cuid);
      const to = cuidMap.get(e.to_cuid);
      if (!from || !to) continue;
      await db.prepare(
        `INSERT OR IGNORE INTO automation_diagram_edges (automation, from_cuid, to_cuid) VALUES (?, ?, ?)`,
      ).run(cloneAutomation, from, to);
    }
  } catch { /* no diagram-edges table on an older DB — the file diagram still copied */ }

  // 5. Use cases are DESIGN (the scenarios), not runtime data — carry them as FRESH (status "new", no review
  //    row), so the clone keeps its scenarios but the owner re-confirms them for this new instance. Then
  //    regenerate the file artefact so its ids match the clone's fresh rows.
  try {
    const cases = await listCases(src.automation);
    for (const c of cases) await addCase(cloneAutomation, { title: c.title, summary: c.summary, status: "new" });
    if (cases.length) await regenerateUseCasesFile(cloneDir, cloneAutomation);
  } catch { /* use-case store absent — the clone simply starts with no scenarios */ }

  // Everything ELSE keyed by the automation (runs, instances, schedule, dashboard rows, finance, images, geo,
  // calendar tokens, quiz, transport/history, lifecycle) is deliberately NOT copied — a clean clone. Secrets
  // are never in the folder (app/.env.local is slot-level, keyed by the slug), so the clone starts unconfigured.
  // VECTOR MEMORY is likewise NOT copied (step 261, owner's decision): the clone starts with empty memory and
  // accrues its own under its OWN provenance `projects/<cat>/<clone-slug>`; its catalog doc is born on the
  // first "How it works" click. Copying the source's memory would make the clone inherit the original's whole
  // history under a re-sourced address — a clean clone must not.

  // 6. Title — the owner's chosen name, on the page (_data/description.ts) and the card (README meta).
  const descPath = join(cloneDir, "_data", "description.ts");
  const descSrc = await readFile(descPath, "utf8").catch(() => "");
  if (descSrc) await writeFile(descPath, patchDescriptionTitle(descSrc, title), "utf8");
  const readmePath = join(cloneDir, "README.md");
  const readmeSrc = await readFile(readmePath, "utf8").catch(() => "");
  if (readmeSrc) await writeFile(readmePath, patchReadmeTitle(readmeSrc, title), "utf8");

  scheduleRebuild();
  return NextResponse.json({
    ok: true, automation: cloneAutomation, category: src.category, slug: cloneSlug, title,
    url: `/projects/${cloneAutomation}`, rebuilding: true,
  });
}
