import { readFile } from "fs/promises";
import { join } from "path";
import type { ProjectCategorySlug } from "./categories";

// Project card metadata (step 207.10 item 3) — the blog-style card the category hub shows for each
// project. Source of truth is the project's decomposition README.md (the fractera:project meta block,
// same one the architecture cockpit reads), so the card never drifts from the graph. Server-only (fs
// read at build/render); degrades to a prettified slug when a project has no README yet.
export type ProjectCard = {
  slug: string;
  title: string;
  description: string;
  badges: string[]; // I/O port types + tool short-names, de-duplicated (the card shows a few + "+N")
};

function prettify(slug: string): string {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Reduce a verbose tool string to a short badge label: drop parentheticals, any route/URL tail, and a
// trailing HTTP verb/method, then cap the length. "fractera-cron (co-located cron.json)" → "fractera-cron";
// "Telegram Bot API getUpdates" → "Telegram Bot API"; "run route POST /api/…/run" → "run route".
function shortTool(t: string): string {
  let s = t.replace(/\s*\(.*$/, ""); // drop "(…)"
  s = s.replace(/\s+(GET|POST|PUT|DELETE|PATCH)\b.*$/i, ""); // drop trailing HTTP verb + rest
  s = s.replace(/\s*(https?:\/\/|\/[a-z]).*$/i, ""); // drop a URL / route tail
  s = s.replace(/\s+(get|post|send|create|update)[A-Za-z]+.*$/, ""); // drop a trailing camelCase method
  s = s.trim();
  return s.length > 28 ? s.slice(0, 27).trimEnd() + "…" : s;
}

type MetaPort = { type?: string; source?: string; destination?: string };
type MetaNode = { tools?: string[] };
type ProjectMeta = {
  title?: string;
  project?: { title?: string; purpose?: string; result?: string };
  interface?: { inputs?: MetaPort[]; outputs?: MetaPort[] };
  nodes?: MetaNode[];
};

export async function getProjectCard(category: ProjectCategorySlug, slug: string): Promise<ProjectCard> {
  const fallback: ProjectCard = { slug, title: prettify(slug), description: "", badges: [] };
  try {
    const raw = await readFile(
      join(process.cwd(), "app", "(projects)", "projects", category, slug, "README.md"),
      "utf8",
    );
    const m = raw.match(/<!--\s*fractera:project\s*([\s\S]*?)-->/);
    if (!m) return fallback;
    const meta = JSON.parse(m[1].trim()) as ProjectMeta;
    const iface = meta.interface ?? {};
    const portTypes = [
      ...(iface.inputs ?? []).map((p) => p.type),
      ...(iface.outputs ?? []).map((p) => p.type),
    ].filter((t): t is string => Boolean(t));
    const tools = (meta.nodes ?? []).flatMap((n) => n.tools ?? []).map(shortTool).filter(Boolean);
    const badges = Array.from(new Set([...portTypes, ...tools]));
    return {
      slug,
      title: meta.title ?? meta.project?.title ?? prettify(slug),
      description: meta.project?.purpose ?? meta.project?.result ?? "",
      badges,
    };
  } catch {
    return fallback;
  }
}
