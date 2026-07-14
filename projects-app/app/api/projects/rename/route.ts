import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { authorize, resolveProject, scheduleRebuild } from "@/lib/nodes";

// RENAME AN AUTOMATION (step 241 E3.2, owner's request) — the Danger zone's second action, beside Delete.
//
// It changes the automation's DISPLAY NAME only — the title shown on its page (from _data/description.ts) and
// on its card in the category grid (from the README's fractera:project meta). It deliberately does NOT touch
// the SLUG: the slug is the automation's identity — its URL, its folder name, its key in every DB row and
// every edge. Renaming that would be a move-everything migration with real breakage risk, and is not what
// "rename" should mean. So the address and all data stay exactly as they are; only the human-facing name moves.
//
// Like the other file-materialized project mutations (create/delete), the two _data / README edits only reach
// the live page after a rebuild — scheduleRebuild() at the end, same locked build path.
export const runtime = "nodejs";

// Replace the FIRST `title: "..."` inside `export const PROJECT_DESCRIPTION = { ... }`. A function replacement
// (not a string one) so a `$` in the new title is never interpreted as a capture-group reference.
function patchDescriptionTitle(src: string, title: string): string | null {
  const re = /(export const PROJECT_DESCRIPTION\s*=\s*\{[\s\S]*?\btitle:\s*)"(?:[^"\\]|\\.)*"/;
  if (!re.test(src)) return null;
  return src.replace(re, (_m, prefix: string) => prefix + JSON.stringify(title));
}

// Update the card's source of truth: the fractera:project meta title (and its nested project.title, if any).
// Also refresh the skeleton README's own H1 heading when it still carries the frozen-skeleton wording — a
// developed project's hand-written heading is left untouched.
function patchReadme(src: string, title: string): string {
  let out = src;
  const meta = out.match(/<!--\s*fractera:project\s*([\s\S]*?)-->/);
  if (meta) {
    try {
      const obj = JSON.parse(meta[1].trim()) as Record<string, unknown> & { project?: Record<string, unknown> };
      obj.title = title;
      if (obj.project && typeof obj.project === "object") obj.project.title = title;
      out = out.replace(meta[0], `<!-- fractera:project ${JSON.stringify(obj)} -->`);
    } catch { /* corrupt meta block — leave it, the description.ts edit still renames the page */ }
  }
  // The skeleton heading "# <name> — frozen automation project (v4 skeleton)".
  out = out.replace(/^#\s+.*?(\s+—\s+frozen automation project)/m, `# ${title}$1`);
  return out;
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string; title?: string } | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  const title = String(body?.title ?? "").trim().slice(0, 120);
  if (!title) return NextResponse.json({ error: "a new name is required" }, { status: 400 });

  let changed = false;

  // 1. the page title — _data/description.ts
  const descPath = join(proj.projectDir, "_data", "description.ts");
  try {
    const src = await readFile(descPath, "utf8");
    const patched = patchDescriptionTitle(src, title);
    if (patched && patched !== src) {
      await writeFile(descPath, patched, "utf8");
      changed = true;
    }
  } catch { /* no description.ts on this project — the README edit below may still rename the card */ }

  // 2. the card title — README.md fractera:project meta (+ skeleton H1)
  const readmePath = join(proj.projectDir, "README.md");
  try {
    const src = await readFile(readmePath, "utf8");
    const patched = patchReadme(src, title);
    if (patched !== src) {
      await writeFile(readmePath, patched, "utf8");
      changed = true;
    }
  } catch { /* no README — nothing to do here */ }

  if (!changed) {
    return NextResponse.json({ error: "could not find a display name to change" }, { status: 400 });
  }

  scheduleRebuild();
  return NextResponse.json({ ok: true, title, rebuilding: true });
}
