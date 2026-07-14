import { NextRequest, NextResponse } from "next/server";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { authorize, resolveProject } from "@/lib/nodes";
import { dirForRel, writeMeta, relToUrl, type PageMeta, type Task } from "@/lib/app-pages/readme";

// DECLARE A PUBLIC APPLICATION PAGE (step 242) — the accordion's "Add page". Mirrors the service page's
// `requested` POST, but: OWNER-facing, pages default under `[lang]` (multilingual), visibility PUBLIC (external
// users), and the README is stamped with the automation that declared it. Declaring only writes a README (no
// built file) — the tree scan is a live fs read, so no rebuild is needed to see it; a coding agent turns the
// declaration into a real page later.
export const runtime = "nodejs";

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
function normBase(b: unknown): string {
  return typeof b === "string" ? b.replace(/^\/+|\/+$/g, "").trim() : "";
}
async function taken(rel: string): Promise<boolean> {
  try { await stat(join(dirForRel(rel), "README.md")); return true; } catch { /* not declared */ }
  try { await stat(join(dirForRel(rel), "page.tsx")); return true; } catch { /* not built */ }
  return false;
}
async function uniqueLeaf(base: string, seed: string, dynamic: boolean): Promise<string> {
  const seg = (s: string) => (dynamic ? `[${s}]` : s);
  const join_ = (leaf: string) => (base ? `${base}/${leaf}` : leaf);
  const s0 = seed || "page";
  if (!(await taken(join_(seg(s0))))) return s0;
  let n = 2;
  while (await taken(join_(seg(`${s0}-${n}`)))) n++;
  return `${s0}-${n}`;
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as
    | { automation?: string; base?: string; title?: string; dynamic?: boolean; multilingual?: boolean; todo?: unknown[] }
    | null;
  const title = String(body?.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  // The automation tag is optional but resolved when present, so a bad slug is rejected up front.
  let automation: string | null = null;
  if (body?.automation) {
    const p = resolveProject(String(body.automation));
    if (!p.ok) return NextResponse.json({ error: p.error }, { status: 400 });
    automation = p.automation;
  }

  const multilingual = body?.multilingual !== false; // default ON (external users worldwide)
  let base = normBase(body?.base);
  // Multilingual pages live under [lang]; if the owner picked a folder that is not already localized, nest it.
  if (multilingual && base.split("/")[0] !== "[lang]") base = base ? `[lang]/${base}` : "[lang]";

  const dynamic = !!body?.dynamic;
  const slug = await uniqueLeaf(base, slugify(title), dynamic);
  const leaf = dynamic ? `[${slug}]` : slug;
  const rel = base ? `${base}/${leaf}` : leaf;

  const tasks: Task[] = Array.isArray(body?.todo)
    ? body!.todo.map(String).map((s) => s.trim()).filter(Boolean).map((b) => ({ id: crypto.randomUUID(), body: b }))
    : [];

  const meta: PageMeta = {
    rel, title, kind: "page", dynamic, description: null,
    visibility: "public", automation, multilingual, tasks,
  };
  await writeMeta(meta);

  return NextResponse.json({ ok: true, page: { rel, title, url: relToUrl(rel), multilingual, automation, taskCount: tasks.length } }, { status: 201 });
}
