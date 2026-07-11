// ─────────────────────────────────────────────────────────────────────────────
// FROZEN AUTOMATION STARTER (step 214) — the "запусти проект автоматизации" processor.
//
// ONE function, ONE entry point (POST /api/projects/create), TWO callers: the owner's terminal
// (curl) today, an AI agent via the same HTTP call later — never a second code path. By
// construction: pure template + token substitution, ZERO code generation. It materializes a
// working (if minimal) project into projects-app: real folders + components that RENDER — the
// standard header + footer come from the Projects-zone layout (step 213), and the body is a
// centered "Project coming soon" + a project README (see SKELETON below). This is VERSION 1:
// the template GROWS node by node — each development version adds one entry to SKELETON, and a
// re-run shows the automation develop.
//
// Terminal (works today, IP mode — no auth needed):
//   curl -X POST http://<ip>:3003/api/projects/create -H "Content-Type: application/json" \
//        -d '{"category":"personal","project":"youtube","title":"YouTube"}'
//
// See app/api/projects/create/route.ts for the route that calls this function directly.
// ─────────────────────────────────────────────────────────────────────────────
import { mkdir, writeFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
// Single source of truth for category slugs (step 215) — this file used to carry its OWN
// duplicate ["automation","fractera-pages","personal","other"] list, exactly the kind of
// two-sources-of-truth desync that broke telegram-notes-clone (steps 210-212). Categories
// are DATA now (PROJECT_CATEGORIES in _shared/categories.ts) — adding one there is enough
// for this validator to accept it, with zero edits here. See app/(projects)/README.md.
import { PROJECT_CATEGORIES } from "../_shared/categories";

const SLUG_RE = /^[a-z][a-z0-9-]*$/;

export type FrozenProjectInput = { category: string; project: string; title?: string; force?: boolean };
export type FrozenProjectResult =
  | { ok: true; version: number; category: string; project: string; title: string; url: string; files: string[]; next: string }
  | { ok: false; error: string };

function humanize(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// The FROZEN SKELETON — VERSION 1. Map of "path under the project folder" → raw file body.
// Tokens {{CATEGORY}} {{PROJECT}} {{PROJECT_TITLE}} are substituted at materialize time.
// To grow the automation: add entries here (a new node = a new component/data file) and bump VERSION.
const VERSION = 1;
const SKELETON: Record<string, string> = {
  "page.tsx": `import AutomationEntry from "./_components";

// Thin server entry of a frozen automation project. Header + footer come from the
// Projects-zone layout (step 213); the body is AutomationEntry. Frozen skeleton v1.
export default function Page() {
  return <AutomationEntry />;
}
`,
  "_components/index.tsx": `// Frozen automation skeleton — VERSION 1 (the "coming soon" placeholder). The standard
// header and footer are provided by the Projects-zone layout (step 213), so this body is
// deliberately minimal. Each development version adds the next node/component here.
export default function AutomationEntry() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-5xl flex-col items-center justify-center gap-2 px-4 text-center">
      <p className="text-2xl font-semibold">{{PROJECT_TITLE}}</p>
      <p className="text-sm text-muted-foreground">Project coming soon</p>
    </main>
  );
}
`,
  "README.md": `# {{PROJECT_TITLE}} — frozen automation project (v1 skeleton)

Read this file first, every time you touch this project — it is the project's own development
log and grows as the frozen template does. This project was materialized by
\`createFrozenProject\` (\`app/(projects)/projects/_lib/frozen-project-starter.ts\`) into
\`app/(projects)/projects/{{CATEGORY}}/{{PROJECT}}/\`. Header and footer come from the
Projects-zone layout automatically — this folder never renders its own chrome.

## Current state: v1 (blank)
Only the frozen skeleton exists: a page showing "Project coming soon". No automation logic,
no workflow, no data — nothing to build on yet.

## What happens next
The frozen automation template grows node by node, under the owner's direction. Each new
version of the template adds the next building block (the workflow/diagram layer, the run
panel, a results table, integrations, …) — and each addition extends THIS file with the
concrete instructions for turning the current skeleton into the next stage, until it is a
full, repeatable automation (idea → nodes → live runs). Re-read this file before continuing;
do not invent automation logic from habit or memory — follow exactly what it says today.

## Do not
- Do not hand-write files that duplicate what the starter already emits.
- Do not skip ahead of what this README currently documents — the next node's instructions
  land here before they exist anywhere else.

<!-- fractera:project
{"kind":"project","category":"{{CATEGORY}}","slug":"{{PROJECT}}","title":"{{PROJECT_TITLE}}","project":{"title":"{{PROJECT_TITLE}}","purpose":"Not yet decomposed — a blank frozen skeleton (v1). No nodes, no interface, no logic exist yet."},"interface":{"inputs":[],"outputs":[]},"nodes":[]}
-->
`,
  "_meta.ts": `import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field. Frozen automation skeleton v1.
const meta: RouteMeta = {
  kind: "page",
  path: "/projects/{{CATEGORY}}/{{PROJECT}}",
  filePath: "app/app/(projects)/projects/{{CATEGORY}}/{{PROJECT}}/page.tsx",
  status: "live",
  todo: [],

  visibility: "private",
  roles: ["architect", "manager"],
  unauthorizedRedirect: "auth-service /register?requireRole=architect",
  enforcedBy: "component",

  isDynamicRoute: false,
  segmentParams: [],
  pathParams: [],
  dynamicParams: undefined,
  prerenderedParams: undefined,
  routeGroup: "(projects)",
  parallelSlot: undefined,
  parentLayout: "app/app/(projects)/layout.tsx",

  rendering: "dynamic",
  revalidate: undefined,
  runtime: "nodejs",
  maxDuration: undefined,
  preferredRegion: undefined,
  cache: undefined,
  fetchCache: undefined,
  revalidateTags: [],

  seo: {
    supportsSeo: false, indexable: false, inSitemap: false, canonical: null,
    title: undefined, metaDescription: undefined, openGraph: false, ogImage: null,
    jsonLd: [], robots: "noindex, nofollow",
  },

  i18n: { localized: false, locales: [], defaultLocale: undefined },

  queryParams: [],

  entryComponent: "_components/index.tsx",
  pageIsClient: false,
  entryIsClient: false,
  localComponents: ["index"],
  sharedComponents: [],

  hasLoading: false,
  hasError: false,
  hasNotFound: false,
  hasLayout: true,

  methods: [],

  description:
    "{{PROJECT_TITLE}} — a frozen automation project (skeleton v1: placeholder page; header + footer from the zone layout).",
  dataDependencies: [],
  relatedRoutes: ["/projects/{{CATEGORY}}"],
  notes:
    "Projects-layer route: monolingual (site default language, outside [lang]); a project = a NAMED " +
    "folder /projects/{{CATEGORY}}/{{PROJECT}} — dynamic segments are forbidden (§3.12). Grown node by " +
    "node from the frozen automation skeleton.",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
`,
};

// Resolve the projects root: default = <projects-app>/app/(projects)/projects, derived from cwd
// (the projects-app root both in a terminal run and inside an API route on the server).
function defaultProjectsRoot(): string {
  return join(process.cwd(), "app", "(projects)", "projects");
}

async function exists(p: string): Promise<boolean> {
  try { await stat(p); return true; } catch { return false; }
}

export async function createFrozenProject(
  input: FrozenProjectInput,
  opts?: { projectsRoot?: string },
): Promise<FrozenProjectResult> {
  const category = String(input.category ?? "").trim();
  const project = String(input.project ?? "").trim();
  const title = String(input.title ?? "").trim() || (project ? humanize(project) : "");
  const projectsRoot = opts?.projectsRoot ?? defaultProjectsRoot();

  const categorySlugs = PROJECT_CATEGORIES.map((c) => c.slug);
  if (!categorySlugs.includes(category as (typeof categorySlugs)[number])) {
    return { ok: false, error: `category must be one of ${categorySlugs.join(" | ")}` };
  }
  if (!SLUG_RE.test(project)) {
    return { ok: false, error: "project must be a kebab-case slug (starts with a letter)" };
  }

  const destBase = join(projectsRoot, category, project);
  if ((await exists(destBase)) && !input.force) {
    return { ok: false, error: `project already exists: ${category}/${project} (pass force to overwrite)` };
  }

  const tokens: Record<string, string> = {
    "{{CATEGORY}}": category,
    "{{PROJECT}}": project,
    "{{PROJECT_TITLE}}": title,
  };
  const sub = (s: string) => Object.entries(tokens).reduce((acc, [k, v]) => acc.split(k).join(v), s);

  const files: string[] = [];
  for (const [rel, raw] of Object.entries(SKELETON)) {
    const body = sub(raw);
    const leftover = body.match(/\{\{[A-Z_]+\}\}/g);
    if (leftover) return { ok: false, error: `unsubstituted token(s) ${[...new Set(leftover)].join(", ")} in ${rel}` };
    const dest = join(destBase, rel);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, body, "utf8");
    files.push(`app/(projects)/projects/${category}/${project}/${rel}`);
  }

  return {
    ok: true,
    version: VERSION,
    category, project, title,
    url: `/projects/${category}/${project}`,
    files,
    next: "Rebuild projects-app (Deploy): the page renders header + footer + a centered 'Project coming soon'; the folder appears in /service/architecture. Grow the automation by adding the next node to SKELETON and re-running.",
  };
}

// No CLI shim here on purpose: this folder's path contains "(projects)" (a Next.js route
// group), which breaks plain `node`/`tsx` module resolution when the file is invoked
// directly (proven live) — a fragile "works on my machine" entry point is worse than none.
// The ONE real entry point is POST /api/projects/create (see that route's header comment),
// which every caller uses identically: the owner's terminal (curl) today, an AI agent via
// HTTP later. Same function, same path, always.
