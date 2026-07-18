import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { authorize, resolveProject } from "@/lib/nodes";
import { generateHowItWorks } from "@/lib/how-it-works";
import { reindexAutomation } from "@/lib/automation-catalog";

// POST { automation, collected } -> { ok: true, result } | { ok: false, error } — the modal's "Get answer
// from AI" button (step 237, rewired 238). `collected` is the JSON2 snapshot the modal's OWN "Collect data"
// button already fetched (fetch-current-automation-architecture-snapshot) and showed to the owner — this
// route asks the model about THAT SAME object, never a fresh re-gather. Overwrites _data/how-it-works.json
// on success.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string; collected?: unknown; prompt?: string } | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  const outcome = await generateHowItWorks(proj.projectDir, body?.collected ?? null, body?.prompt);
  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 502 });

  // CATALOG RE-INDEX (step 258) — the freshly written "How it works" text IS the automation's search embedding.
  // Best-effort and NON-BLOCKING to the response: a missing/slow LightRAG must never fail the owner's answer.
  void (async () => {
    let title = proj.slug;
    try {
      const desc = await readFile(join(proj.projectDir, "_data", "description.ts"), "utf8");
      title = (desc.match(/\btitle:\s*"((?:[^"\\]|\\.)*)"/) ?? [])[1] || proj.slug;
    } catch { /* no description.ts — the slug is a fine fallback title */ }
    await reindexAutomation(proj.automation, title, outcome.result.text);
  })();

  return NextResponse.json({ ok: true, result: outcome.result });
}
