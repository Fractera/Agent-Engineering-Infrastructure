// ─────────────────────────────────────────────────────────────────────────────
// FROZEN AUTOMATION STARTER (step 214) — the "запусти проект автоматизации" processor.
//
// ONE function, TWO callers: the owner runs it in a terminal today; a future API route
// (AI-driven) imports the SAME `createFrozenProject` and calls it — never a second code path.
// By construction: pure template + token substitution, ZERO code generation. It materializes a
// working (if minimal) project into projects-app: real folders + components that RENDER — the
// standard header + footer come from the Projects-zone layout (step 213), and the body is a
// centered "Project coming soon". This is VERSION 1: the template GROWS node by node — each
// development version adds one entry to SKELETON below, and a re-run shows the automation develop.
//
// Terminal (from the projects-app root):
//   npx tsx "app/(projects)/projects/_lib/frozen-project-starter.ts" --category personal --project youtube --title YouTube
//
// API (later): `import { createFrozenProject } from ".../_lib/frozen-project-starter"` then call it.
// ─────────────────────────────────────────────────────────────────────────────
import { mkdir, writeFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";

export const PROJECT_CATEGORIES = ["automation", "fractera-pages", "personal", "other"] as const;
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];
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

  if (!PROJECT_CATEGORIES.includes(category as ProjectCategory)) {
    return { ok: false, error: `category must be one of ${PROJECT_CATEGORIES.join(" | ")}` };
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

// ── CLI entry: run directly from the projects-app root with tsx ──────────────
// `npx tsx "app/(projects)/projects/_lib/frozen-project-starter.ts" --category <cat> --project <slug> [--title "Name"] [--force]`
function argOf(name: string, argv: string[]): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : undefined;
}
const invokedDirect = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("frozen-project-starter.ts");
if (invokedDirect) {
  const argv = process.argv.slice(2);
  const outRoot = argOf("out", argv); // optional: a projects root override (default = cwd/app/(projects)/projects)
  createFrozenProject({
    category: argOf("category", argv) ?? "",
    project: argOf("project", argv) ?? "",
    title: argOf("title", argv),
    force: argv.includes("--force"),
  }, outRoot ? { projectsRoot: outRoot } : undefined).then((r) => {
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.ok ? 0 : 1);
  });
}
