import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { appRoot, relToUrl, readMeta } from "./readme";

// SLOT-APP TREE SCAN (step 242) — a trimmed copy of the service page's fs-scan.ts, walking ONE root: the slot
// `app/` (the application layer). Returns a NESTED tree (the accordion renders a folder tree the owner picks
// from), unlike the service scan's flat lists merged with a curated seed. A folder with a page/route file is
// LIVE (built); with a README.md but no built file it is DECLARED; otherwise it is a plain container. Skips
// Next.js internals and the co-location folders. Read-only.

export type AppNode = {
  rel: string;        // filesystem rel under slot app ("" = the app root)
  name: string;       // this folder's own segment name
  url: string;        // the URL it serves (display only; [lang] and (groups) stripped)
  built: boolean;     // has a page/route file → live
  declared: boolean;  // has a README.md but no built file → declared, waiting for a coder
  taskCount: number;  // open to-dos in its README
  children: AppNode[];
};

const SKIP = new Set(["_components", "_lib", "_data", "_shared", "node_modules", ".next"]);
const PAGE_FILES = ["page.tsx", "page.ts", "page.jsx", "page.js"];
const ROUTE_FILES = ["route.ts", "route.js"];

async function walk(dir: string, rel: string): Promise<AppNode[]> {
  let entries: string[];
  try { entries = await readdir(dir); } catch { return []; }
  const nodes: AppNode[] = [];
  for (const name of entries) {
    if (SKIP.has(name) || name.startsWith(".")) continue;
    const full = join(dir, name);
    const st = await stat(full).catch(() => null);
    if (!st?.isDirectory()) continue;
    const childRel = rel ? `${rel}/${name}` : name;
    let inner: string[] = [];
    try { inner = await readdir(full); } catch { /* unreadable → treat as empty */ }
    const set = new Set(inner);
    const built = PAGE_FILES.some((f) => set.has(f)) || ROUTE_FILES.some((f) => set.has(f));
    const hasReadme = set.has("README.md");
    let taskCount = 0;
    if (hasReadme) {
      const meta = await readMeta(childRel).catch(() => null);
      taskCount = meta?.tasks.length ?? 0;
    }
    nodes.push({
      rel: childRel,
      name,
      url: relToUrl(childRel),
      built,
      declared: hasReadme && !built,
      taskCount,
      children: await walk(full, childRel),
    });
  }
  // Folders first by name — stable, legible.
  nodes.sort((a, b) => a.name.localeCompare(b.name));
  return nodes;
}

/** The whole slot-app folder tree (root's children are the top-level folders). */
export async function scanAppTree(): Promise<{ children: AppNode[] }> {
  return { children: await walk(appRoot(), "") };
}
