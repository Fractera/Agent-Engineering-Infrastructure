import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { authorize, projectsRoot } from "@/lib/nodes";
import { reindexAutomation } from "@/lib/automation-catalog";

// CATALOG BACKFILL (step 258) — index into the search catalog every automation that ALREADY carries a "How it
// works" description on disk (_data/how-it-works.json), WITHOUT calling the model: it re-uses the existing
// text, so it is cheap and idempotent. An automation with no description yet is skipped — it enters the
// catalog the moment someone clicks "How it works" (the generate route's hook). Architect/manager only.
//
// This exists because automations born before step 258, or that never had their description generated, are
// invisible to the search until indexed. POST it once after deploy (or whenever) to populate the catalog.
export const runtime = "nodejs";

async function subdirs(dir: string): Promise<string[]> {
  return (await readdir(dir, { withFileTypes: true }).catch(() => []))
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name);
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const root = projectsRoot();
  let indexed = 0;
  let skipped = 0;
  const done: string[] = [];

  for (const category of await subdirs(root)) {
    for (const slug of await subdirs(join(root, category))) {
      const automation = `${category}/${slug}`;
      const dir = join(root, category, slug);
      let text = "";
      try {
        const raw = await readFile(join(dir, "_data", "how-it-works.json"), "utf8");
        text = (JSON.parse(raw) as { text?: string }).text ?? "";
      } catch { /* no description — will be indexed on first "How it works" click */ }
      if (!text.trim()) { skipped++; continue; }
      let title = slug;
      try {
        const desc = await readFile(join(dir, "_data", "description.ts"), "utf8");
        title = (desc.match(/\btitle:\s*"((?:[^"\\]|\\.)*)"/) ?? [])[1] || slug;
      } catch { /* slug is a fine fallback */ }
      await reindexAutomation(automation, title, text);
      indexed++;
      done.push(automation);
    }
  }

  return NextResponse.json({ ok: true, indexed, skipped, automations: done });
}
