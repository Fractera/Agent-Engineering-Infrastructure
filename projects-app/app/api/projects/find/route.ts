import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { authorize, projectsRoot } from "@/lib/nodes";
import { catalogQuery } from "@/lib/automation-catalog";

// INTELLIGENT AUTOMATION SEARCH (step 258 phase 3) — the owner describes, in words, the automation he needs;
// the system finds the closest ready ones from the catalog (their "How it works" text, indexed in LightRAG).
// This is what makes a library of hundreds of ready automations usable: you find one that fits and clone it,
// instead of building from scratch.
//
// POST { query } -> { ok, results: [{ automation, category, slug, title, ready, url, snippet }] }. It resolves
// each vector hit to a real card (title from _data/description.ts, ready from the node index) and drops any hit
// whose folder no longer exists (a stale vector doc). No model call here — the catalog embedding already did
// the semantic work; this route only ranks-through and resolves.
export const runtime = "nodejs";

async function cardFor(automation: string): Promise<{ title: string; exists: boolean }> {
  const [category, slug] = automation.split("/");
  if (!category || !slug) return { title: automation, exists: false };
  const dir = join(projectsRoot(), category, slug);
  try {
    const desc = await readFile(join(dir, "_data", "description.ts"), "utf8");
    const title = (desc.match(/\btitle:\s*"((?:[^"\\]|\\.)*)"/) ?? [])[1] || slug;
    return { title, exists: true };
  } catch {
    return { title: slug, exists: false };
  }
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { query?: string } | null;
  const query = String(body?.query ?? "").trim();
  if (!query) return NextResponse.json({ error: "a query is required" }, { status: 400 });

  const hits = await catalogQuery(query);
  const results: Array<{
    automation: string; category: string; slug: string; title: string; ready: boolean; url: string; snippet: string;
  }> = [];
  for (const h of hits) {
    const card = await cardFor(h.automation);
    if (!card.exists) continue; // a stale vector doc for a deleted automation — skip it
    const [category, slug] = h.automation.split("/");
    results.push({
      automation: h.automation, category, slug, title: card.title,
      ready: true, url: `/projects/${h.automation}`, snippet: h.snippet,
    });
  }
  return NextResponse.json({ ok: true, results });
}
