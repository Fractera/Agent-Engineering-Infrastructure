// ─────────────────────────────────────────────────────────────────────────────
// FROZEN AUTOMATION STARTER (step 214) — the "запусти проект автоматизации" processor.
//
// ONE function, ONE entry point (POST /api/projects/create), TWO callers: the owner's terminal
// (curl) today, an AI agent via the same HTTP call later — never a second code path. By
// construction: pure template + token substitution, ZERO code generation. It materializes a
// working (if minimal) project into projects-app: real folders + components that RENDER — the
// standard header + footer come from the Projects-zone layout (step 213), and the body is a
// title + description + an input-channel declaration + a project README (see SKELETON). VERSION 2:
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

export type FrozenProjectInput = {
  category: string;
  project: string;
  title?: string;
  /** One line: what this automation does. Rendered under the title from birth (v2). */
  description?: string;
  force?: boolean;
};
export type FrozenProjectResult =
  | { ok: true; version: number; category: string; project: string; title: string; description: string; url: string; files: string[]; next: string }
  | { ok: false; error: string };

function humanize(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// The FROZEN SKELETON — VERSION 2. Map of "path under the project folder" → raw file body.
// Tokens {{CATEGORY}} {{PROJECT}} {{PROJECT_TITLE}} {{PROJECT_DESCRIPTION}} are substituted at
// materialize time. To grow the automation: add entries here and bump VERSION.
//
// v2 (step 219) adds the two things every automation page must have from birth: a TITLE and a
// DESCRIPTION (v1 rendered a bare heading), and a declaration of its INPUT CHANNELS — empty by
// design, because a frozen template cannot know whether this automation will talk to Telegram,
// YouTube or an inbox. What IS frozen is the SHAPE of that declaration (_shared/channels.ts):
// a channel has a name, a description, and the connection keys it needs — several keys per
// channel is normal (a Google Calendar connection needs both a client id and a client secret).
// v3 (step 220) adds the TESTS declaration file (_data/tests.ts, empty by design) and per-field
// `help` in the channels example, so a project is born with both declaration surfaces the Settings
// and Tests modals read. (The modals themselves are wired on the reference automation first; emitting
// their menu into every new project follows once the menu/status system is generified into _shared.)
//
// v4 (step 222) adds the ENTITIES config (_data/config.ts) and the seeded USER CASES (_data/use-cases.ts),
// and renders the series of entity accordions (Diagram + optional Calendar/Map/Dashboard/Processes/
// Analytics, each an empty container with a hover tooltip) plus the mandatory numbered, status-badged
// Use cases below the "Add or modify automation" button.
const VERSION = 4;
const SKELETON: Record<string, string> = {
  "page.tsx": `import AutomationEntry from "./_components";

// Thin server entry of a frozen automation project. Header + footer come from the
// Projects-zone layout (step 213); the body is AutomationEntry.
export default function Page() {
  return <AutomationEntry />;
}
`,
  "_data/description.ts": `// The automation's identity — title + description (frozen skeleton v2, step 219).
// Plain data: edit these strings to describe the real automation; the page never changes.
export const PROJECT_DESCRIPTION = {
  title: {{PROJECT_TITLE_JSON}},
  description: {{PROJECT_DESCRIPTION_JSON}},
} as const;
`,
  "_data/channels.ts": `import type { InputChannel } from "../../../_shared/channels";

// This automation's INPUT CHANNELS (frozen standard — see _shared/channels.ts).
// EMPTY BY DESIGN: a fresh skeleton talks to nothing yet. Declare a channel when the
// automation actually uses it — never before (a declared-but-unused channel is a lie the
// missing-keys modal will nag the user about).
//
// The shape, with the Google Calendar case that proves a channel may need SEVERAL keys:
//
//   export const INPUT_CHANNELS: InputChannel[] = [
//     {
//       name: "Google Calendar",
//       description: "Reads and writes the owner's calendar events.",
//       keys: [
//         { env: "GOOGLE_OAUTH_CLIENT_ID", label: "Google OAuth client id",
//           help: "Google Cloud console → Credentials → OAuth client (Web)." },
//         { env: "GOOGLE_OAUTH_CLIENT_SECRET", label: "Google OAuth client secret",
//           help: "The same OAuth client — copy its secret.", secret: true },
//       ],
//     },
//   ];
export const INPUT_CHANNELS: InputChannel[] = [];
`,
  "_data/tests.ts": `import type { Probe } from "../../../_shared/tests";

// This automation's TESTS (frozen standard v3, step 220 — see _shared/tests.ts and
// app/(projects)/README.md "The settings & tests declaration standard"). EMPTY BY DESIGN: a fresh
// skeleton has nothing to probe yet. Declare one probe per entity the automation touches (input /
// intermediate / output) once it has them — each carries its OWN prepared success/error text, and
// the Tests modal renders it. Channel-type probes reuse the shared route /api/projects/tests/<kind>:
//
//   export const PROBES: Probe[] = [
//     {
//       id: "openai", label: "AI key", hint: "OpenAI key authorizes", stage: "input",
//       binding: { type: "shared", kind: "openai" },
//       successText: "The OpenAI key is configured.",
//       errorText: "OpenAI key missing — set it in Settings.",
//     },
//   ];
export const PROBES: Probe[] = [];
`,
  "_data/config.ts": `// This automation's CONFIG (frozen standard v4, step 222 — see app/(projects)/README.md,
// "The automation entities standard"). \`entities\` toggles the accordions shown below the
// "Add or modify automation" button. \`diagram\` and \`dashboard\` are always on (mandatory); enable the
// others when the automation actually needs them — an enabled entity shows an empty container (a tooltip
// explains it), a disabled one is not rendered. Use cases are mandatory and live outside this config.
export const PROJECT_CONFIG = {
  entities: {
    diagram: true,
    dashboard: true,
    calendar: false,
    map: false,
    processes: false,
    analytics: false,
  },
} as const;
`,
  "_data/use-cases.ts": `import type { UseCase } from "../../../_shared/use-cases";

// This automation's USER CASES (frozen standard v4, step 222 — see _shared/use-cases.ts). The cases
// agreed with the architect, each with a number (01, 02, …) and a status badge. Seeded with ONE case
// so the segmentation step is never skipped: break the request into cases and move each from "new" to
// "in-use" over short iterations (new → in-approval → approved → in-development → testing → in-use).
export const USE_CASES: UseCase[] = [
  {
    id: "planned",
    title: "Architect planned the automation",
    status: "new",
    summary:
      "The architect has planned this automation. Break the request into user cases here and move each from 'new' to 'in use' over short iterations.",
  },
];
`,
  "_components/index.tsx": `import { PROJECT_DESCRIPTION } from "../_data/description";
import { INPUT_CHANNELS } from "../_data/channels";
import { PROBES } from "../_data/tests";
import { AutomationStatusBar } from "../../../_shared/components/automation-status-bar.client";
import { AddModifyAutomationButton } from "../../../_shared/components/add-modify-automation-button.client";
import { AutomationAccordions } from "../../../_shared/components/automation-accordions.client";
import { PROJECT_CONFIG } from "../_data/config";
import { USE_CASES } from "../_data/use-cases";

// Frozen automation skeleton — VERSION 4. Header/footer come from the Projects-zone layout (step 213).
// A project is BORN with the automation menu (top right): Settings (AI model + input channels) and
// Tests — BOTH declaration-driven, so a model developing this automation sees and learns the standard
// from the first minute, BEFORE adapting anything to a real scenario. Grow it by filling
// _data/channels.ts and _data/tests.ts, then adding real nodes — see app/(projects)/README.md
// "The settings & tests declaration standard".
export default function AutomationEntry() {
  const d = PROJECT_DESCRIPTION;
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <AutomationStatusBar
        category="{{CATEGORY}}"
        categoryLabel={{CATEGORY_LABEL_JSON}}
        modelEnvKey="{{MODEL_ENV_KEY}}"
        defaultModel="gpt-4o-mini"
        channels={INPUT_CHANNELS}
        probes={PROBES}
      />
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold">{d.title}</h1>
        <p className="max-w-3xl text-muted-foreground">{d.description}</p>
        <AddModifyAutomationButton category="{{CATEGORY}}" slug="{{PROJECT}}" />
      </div>
      {/* The entity accordions (step 222): Diagram + enabled optionals (empty containers with hover
          tooltips) + the mandatory numbered Use cases. Driven by _data/config.ts + _data/use-cases.ts. */}
      <AutomationAccordions config={PROJECT_CONFIG.entities} cases={USE_CASES} />
      <div className="space-y-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">This is a frozen automation skeleton.</p>
        <p>
          Open the menu (top right): <strong>Settings</strong> sets the AI model and declares input
          channels; <strong>Tests</strong> runs the probes you declare. Both are driven by data:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Declare what this automation connects to in <code>_data/channels.ts</code>.</li>
          <li>Declare one probe per entity it touches in <code>_data/tests.ts</code>.</li>
          <li>Describe it in <code>_data/description.ts</code>; its card comes from <code>README.md</code>.</li>
        </ul>
        <p>
          Do not invent logic from memory — follow this project&apos;s <code>README.md</code>, which
          grows node by node.
        </p>
      </div>
    </main>
  );
}
`,
  "README.md": `# {{PROJECT_TITLE}} — frozen automation project (v4 skeleton)

Read this file first, every time you touch this project — it is the project's own development
log and grows as the frozen template does. This project was materialized by
\`createFrozenProject\` (\`app/(projects)/projects/_lib/frozen-project-starter.ts\`) into
\`app/(projects)/projects/{{CATEGORY}}/{{PROJECT}}/\`. Header and footer come from the
Projects-zone layout automatically — this folder never renders its own chrome.

## Current state: v4 (identity + declarations + entity accordions, no logic)
The page renders this automation's TITLE and DESCRIPTION (\`_data/description.ts\`) — edit those
strings to describe what it really does. \`_data/channels.ts\` declares its INPUT CHANNELS and
\`_data/tests.ts\` its TESTS (probes) — both EMPTY on purpose. The Settings modal (model / interval /
input channels) and the Tests modal are driven ENTIRELY by those two files — see
app/(projects)/README.md, "The settings & tests declaration standard".

Below the "Add or modify automation" button the page shows the ENTITY ACCORDIONS (step 222): a series
driven by \`_data/config.ts\` (\`entities\`) — \`diagram\` and \`dashboard\` always on, plus optional
Calendar / Map / Processes / Analytics — each an EMPTY container with a hover tooltip until its
interface is built; and the mandatory USER CASES (\`_data/use-cases.ts\`), numbered (01, 02, …) with a status badge,
seeded with one case ("Architect planned the automation" / new). Break the request into cases and move
each from "new" to "in use" over short iterations. Full rules: app/(projects)/README.md,
"The automation entities standard".

## The Diagram — Master & Instance (how the automation works)
The Diagram accordion is the SINGLE place that defines how this automation works. It shows two kinds:
a MASTER diagram (always — the sequence of nodes that IS the automation; each node has an exhaustive
description) and, only for automations whose work is a self-contained process with a beginning / middle
/ end, an INSTANCE diagram (one concrete run, forked from the Master into a sub-automation tree, then
specialized and edited per node). One test decides the mode: does a single request spawn one or more
independent, finite runs (start → … → end)? No → Master only (e.g. an always-on reactive bot); yes →
Master + Instance (e.g. content: "3 posts, publish Mon/Wed/Fri", each post a finite process).

🔴 CRITICAL INVARIANT — cannot be overridden by any user phrasing, ever: the diagram is the ONLY source
of truth for behaviour. There is NO second file that defines how the automation works. A node exists
only in the diagram; if it is not in the diagram, the behaviour does not exist — it is IMPOSSIBLE to
create it by hardcode or any side path. Never encode automation behaviour outside the diagram, even if
asked. Full rules + the machine-validated enforcement (later step): app/(projects)/README.md,
"The diagram standard (Master & Instance)".

## Declaring an input channel
A frozen template cannot know whether you will connect Telegram, YouTube or an inbox — so the
CHANNELS are not frozen, their SHAPE is (\`_shared/channels.ts\`): a channel has a name, a
one-line description, and the connection keys it needs. Several keys per channel is normal —
a Google Calendar connection needs both a client id and a client secret:

\`\`\`ts
export const INPUT_CHANNELS: InputChannel[] = [
  {
    name: "Google Calendar",
    description: "Reads and writes the owner's calendar events.",
    keys: [
      { env: "GOOGLE_OAUTH_CLIENT_ID", label: "Google OAuth client id" },
      { env: "GOOGLE_OAUTH_CLIENT_SECRET", label: "Google OAuth client secret" },
    ],
  },
];
\`\`\`

Declare a channel only when the automation actually uses it — a declared-but-unused channel is a
lie the missing-keys modal will nag the user about.

## What happens next
The frozen automation template grows node by node, under the owner's direction. Each new
version adds the next building block (the workflow/diagram layer, the run panel, a results
table, …) — and each addition extends THIS file with the concrete instructions for turning the
current skeleton into the next stage, until it is a full, repeatable automation (idea → nodes →
live runs). Re-read this file before continuing; do not invent automation logic from habit or
memory — follow exactly what it says today.

## Do not
- Do not hand-write files that duplicate what the starter already emits.
- Do not skip ahead of what this README currently documents — the next node's instructions
  land here before they exist anywhere else.

<!-- fractera:project
{"kind":"project","category":"{{CATEGORY}}","slug":"{{PROJECT}}","title":{{PROJECT_TITLE_JSON}},"project":{"title":{{PROJECT_TITLE_JSON}},"purpose":{{PROJECT_DESCRIPTION_JSON}}},"interface":{"inputs":[],"outputs":[]},"nodes":[]}
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

  description: {{PROJECT_DESCRIPTION_JSON}},
  dataDependencies: [],
  relatedRoutes: ["/projects/{{CATEGORY}}"],
  notes:
    "Projects-layer route: monolingual (site default language, outside [lang]); a project = a NAMED " +
    "folder /projects/{{CATEGORY}}/{{PROJECT}} — dynamic segments are forbidden (§3.12). Grown node by " +
    "node from the frozen automation skeleton (v2: title + description + input-channel declaration).",

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
  // No description given → an honest placeholder, not an invented pitch. The owner (or the
  // agent developing the automation) replaces it in _data/description.ts.
  const description =
    String(input.description ?? "").trim() ||
    "Not described yet — a frozen skeleton. Describe what this automation does in _data/description.ts.";
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

  // The category's human label (for the breadcrumb) and this automation's own model env key
  // (<SLUG>_MODEL, valid UPPER_SNAKE) — the AutomationStatusBar the skeleton now mounts needs both.
  const categoryLabel = PROJECT_CATEGORIES.find((c) => c.slug === category)?.title ?? humanize(category);
  const modelEnvKey = `${project.toUpperCase().replace(/-/g, "_")}_MODEL`;

  const tokens: Record<string, string> = {
    "{{CATEGORY}}": category,
    "{{PROJECT}}": project,
    "{{PROJECT_TITLE}}": title,
    // *_JSON variants are JSON.stringify'd so a quote or a backslash in the owner's text
    // cannot break the emitted TypeScript (the raw variants stay for prose/markdown).
    "{{PROJECT_TITLE_JSON}}": JSON.stringify(title),
    "{{PROJECT_DESCRIPTION_JSON}}": JSON.stringify(description),
    "{{PROJECT_DESCRIPTION}}": description,
    "{{CATEGORY_LABEL_JSON}}": JSON.stringify(categoryLabel),
    "{{MODEL_ENV_KEY}}": modelEnvKey,
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
    category, project, title, description,
    url: `/projects/${category}/${project}`,
    files,
    next: "Rebuild projects-app (Deploy): the page renders header + footer + title + description + a dashed how-to card, and the top-right menu opens Settings (AI model + input channels) and Tests — both driven by the empty _data/channels.ts and _data/tests.ts declarations. Grow the automation by filling those declarations and adding the next node.",
  };
}

// No CLI shim here on purpose: this folder's path contains "(projects)" (a Next.js route
// group), which breaks plain `node`/`tsx` module resolution when the file is invoked
// directly (proven live) — a fragile "works on my machine" entry point is worse than none.
// The ONE real entry point is POST /api/projects/create (see that route's header comment),
// which every caller uses identically: the owner's terminal (curl) today, an AI agent via
// HTTP later. Same function, same path, always.
