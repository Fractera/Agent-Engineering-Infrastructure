import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { appRoot, relToUrl, readMeta } from "./readme";

// THIS AUTOMATION'S APPLICATION PAGES (step 242; simplified in 242.4 — the file tree was removed). The owner's
// call: showing the whole slot `app/` tree only confused things. An automation declares its public pages with
// one button (always under `[lang]`), and this returns the flat list of the pages IT declared — matched by the
// `automation` tag each page README carries. Read-only fs scan under `[lang]`, so a new page shows without a
// rebuild.

export type PageBrief = { rel: string; title: string; url: string; taskCount: number };

const SKIP = new Set(["_components", "_lib", "_data", "_shared", "node_modules", ".next"]);

async function collect(dir: string, rel: string, automation: string, out: PageBrief[]): Promise<void> {
  let entries: string[];
  try { entries = await readdir(dir); } catch { return; }
  if (entries.includes("README.md")) {
    const meta = await readMeta(rel).catch(() => null);
    if (meta && meta.automation === automation) {
      out.push({ rel, title: meta.title, url: relToUrl(rel), taskCount: meta.tasks.length });
    }
  }
  for (const name of entries) {
    if (SKIP.has(name) || name.startsWith(".")) continue;
    const full = join(dir, name);
    const st = await stat(full).catch(() => null);
    if (st?.isDirectory()) await collect(full, rel ? `${rel}/${name}` : name, automation, out);
  }
}

/** Every page this automation declared, under the slot's `[lang]` layer, newest-agnostic (sorted by title). */
export async function listAutomationPages(automation: string): Promise<PageBrief[]> {
  const out: PageBrief[] = [];
  await collect(join(appRoot(), "[lang]"), "[lang]", automation, out);
  out.sort((a, b) => a.title.localeCompare(b.title));
  return out;
}
