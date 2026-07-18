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
import { createNodeId } from "@/lib/cuid";
import { regenerateExecutables } from "@/lib/executables";
import { addRow } from "@/lib/dashboard-rows";
import { agentCanon } from "./automation-agent-canon";

const SLUG_RE = /^[a-z][a-z0-9-]*$/;

export type FrozenProjectInput = {
  category: string;
  project: string;
  title?: string;
  /** One line: what this automation does. Rendered under the title from birth (v2). */
  description?: string;
  /** The IMMUTABLE automation type (step 224 §1.5, extended 234/234.3): "stream" (no forks, one scheme per
   *  event), "instanced" (each run forks Master -> Instance with its own parameters, may be deferred/
   *  tracked), or "chained" (a link in a chain of separate automations, renders as a group container on the
   *  global canvas). Chosen in the creation modal, written into _data/automation.ts, shown as the top-bar
   *  badge. */
  type?: "stream" | "instanced" | "chained";
  /** PHASE 1 (creation): the owner's MANDATORY free-form instruction — what this automation must do. It is
   *  the seed the activation Quiz (step 227) turns into nodes; stored as _data/instruction.md. */
  instruction?: string;
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
//
// v5 (step 231) — the USER CASES are no longer seeded with a placeholder case: they are the automation's
// FIRST stage and they come from the Quiz, which opens on the first visit and refuses to design a single
// node until the owner has described his scenarios. The file below is regenerated from the case store on
// every add / edit / delete (lib/use-cases.ts), so a fresh project starts with an empty, generated list.
// v6 (step 239) — the entity accordions became real DESIGN surfaces: every requirement panel carries the
// shared VoiceInput primitive + "Add with AI" (the same Quiz, on that entity as its subject), and an
// `instanced` automation additionally gets the FORK ACTIVATION surface (how one run starts: its settings, the
// fork created with them, the launch schedule). The skeleton passes AUTOMATION_TYPE to AutomationAccordions so
// that surface appears without a lookup; projects generated before v6 fall back to a client type fetch.
// v7 (step 240) — THE DEVELOPMENT WAVE. The page is wrapped in WaveLockProvider and opens with the
// DevelopmentWaveBanner: the ONE place development is launched from. Every per-entity "Start development"
// button is gone (the diagram's, the node panel's, each requirement panel's, the chain brief's) — a change is
// SAVED (staged), and the banner hands the whole batch over as one step. After the hand-off the page is
// LOCKED until the coding agent calls development-wave/complete on a successful deploy.
// v8 (step 241 E3) — THE ACTIVATION LAYER. Every automation is born with `_data/activation.ts` (empty, like
// channels/tests: the coding agent declares what ONE RUN of THIS automation takes), and an INSTANCED
// automation renders the launch control panel from it — a PERMANENT section, never an accordion, never
// hideable. Nothing about schedules or limits is built into the product: they are just parameters an
// automation may declare.
// v9 (step 243) — STREAM'S STARTING PATTERN IS REAL, NOT DRAFT. Owner's correction after 241/242: three
// confusing empty red nodes do not teach a coding agent the architecture — a WORKING example does. A fresh
// `type==="stream"` automation is now born with a real three-node diagram (parse → external HTTP call →
// record-on-success), a real `_data/activation.ts` (the launch console works immediately), and a real
// `_data/dashboard.ts` (a live History table with the step-243 pagination/live-action upgrade already
// wired) — the coding agent ADAPTS this pattern for the owner's actual task instead of inventing the shape
// of "how does an automation work" from nothing. `instanced`/`chained` still get the old generic drafts —
// steps 244/245 give them their own equally real starting pattern.
// v10 (step 243.2) — FIXES FROM LIVE OWNER TESTING: the stream starting pattern's own activation/dashboard
// content is now TEN LANGUAGES (LocalizedText maps, not bare English strings — rule 4г applies to our own
// default content); the launch console's longtext field spans the FULL grid width (was ~50%, a col-span
// bug in the shared ParamField); every accordion section shows a standard "you're viewing a demo" notice
// above its real content; the per-entity design tool (textarea/voice/AI/save) is collapsed by default
// behind a "Construction mode" button; a successful ask/run now refreshes the dashboard table live (a
// window CustomEvent, the SAME idiom already used by use-entities-live.ts — not telegram-notes' poll).
// v11 (owner, 2026-07-15) — THE CRON SLIDER. Every automation is born with the top-of-page cron bar
// (CronProgressBar, generalized from telegram-notes into _shared): a 2px full-bleed orange bar that shrinks
// left→right over one cron period, then resets — its speed IS the cron interval. It renders ONLY while cron
// is ACTIVE (the Cron accordion's enabled switch, off by default) and updates live when the owner flips it.
// v12 (owner, 2026-07-16) — ALL ENTITY SWITCHES ON AT BIRTH. _data/config.ts seeds every visibility toggle
// (controlpanel/diagram/dashboard/calendar/cron/map/processes/analytics/usecases/apppages) to true: a fresh
// automation shows every surface it has, and the owner switches OFF what he does not need — an unseen
// switch is a surface the owner never discovers.
const VERSION = 12;
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
  "_data/automation.ts": `import type { AutomationType } from "../../../_shared/automation-type";

// This automation's IMMUTABLE TYPE (frozen standard, step 224, extended 234.3). Chosen once at creation; the
// whole logic grows out of it (above all: whether a run forks). To change it you delete the automation and
// create a new one — there is no "switch type". Shown as the coloured badge in the top bar.
//   stream    — no forks; every incoming event runs the same scheme end to end.
//   instanced — each run forks Master -> Instance with its own parameters; may be deferred and tracked.
//   chained   — a link in a chain of separate automations; renders as a group container on the global canvas.
export const AUTOMATION_TYPE: AutomationType = "{{AUTOMATION_TYPE}}";
`,
  "_data/instruction.md": `{{AUTOMATION_INSTRUCTION}}
`,
  "_data/config.ts": `// This automation's CONFIG (frozen standard v4, step 222; toggles reversed in 237 — see
// app/(projects)/README.md, "The automation entities standard"). \`entities\` is the SEED for the
// hamburger menu's visibility switches (Control panel/Diagram/Calendar/Cron/Map/Dashboard/Processes/
// Analytics/User cases/Application pages) — the owner's live overrides win at runtime, no rebuild involved
// (see use-entities-live.ts). EVERYTHING defaults ON (owner, 2026-07-16): a fresh automation shows every
// surface it has, and the owner switches OFF what he does not need — never the other way round (an unseen
// switch is a surface the owner never discovers). The User cases review gate (step 231) stays mandatory
// before any Development Step regardless of this switch — this only toggles its accordion.
export const PROJECT_CONFIG = {
  entities: {
    controlpanel: true,
    diagram: true,
    dashboard: true,
    calendar: true,
    cron: true,
    map: true,
    processes: true,
    analytics: true,
    usecases: true,
    apppages: true,
  },
} as const;
`,
  "_data/use-cases.ts": `import type { UseCase } from "../../../_shared/use-cases";

// This automation's USER CASES (frozen standard v5, step 231 — see _shared/use-cases.ts).
//
// GENERATED, and EMPTY on purpose: the cases are the FIRST stage of this automation, not a placeholder.
// On the first visit the Quiz asks the owner to describe every scenario (free speech, voice welcome),
// writes them here as numbered cases, and only then designs the nodes. No development step is created
// until the owner has read the cases back and confirmed the AI understood him.
//
// Do not hand-edit: this file is rewritten from the case store on every add / edit / delete. To change a
// case, use the pencil in the Use cases panel (the status walks new → in-approval → approved →
// in-development → testing → in-use).
export const USE_CASES: UseCase[] = [
  // no cases yet — the Quiz collects them first
];
`,
  "_components/index.tsx": `import { PROJECT_DESCRIPTION } from "../_data/description";
import { INPUT_CHANNELS } from "../_data/channels";
import { PROBES } from "../_data/tests";
import { AUTOMATION_TYPE } from "../_data/automation";
import { AutomationStatusBar } from "../../../_shared/components/automation-status-bar.client";
import { CronProgressBar } from "../../../_shared/components/cron-progress-bar.client";
import { DevelopmentWaveBanner } from "../../../_shared/components/development-wave-banner.client";
import { ActivationLayer } from "../../../_shared/components/activation-layer.client";
import { ActivationQuiz } from "../../../_shared/components/activation-quiz.client";
import { AutomationAccordions } from "../../../_shared/components/automation-accordions.client";
import { DiagramSection } from "../../../_shared/components/diagram-section.client";
import { GroupDetailSection } from "../../../_shared/components/group-detail-section.client";
import { PROJECT_CONFIG } from "../_data/config";
import { USE_CASES } from "../_data/use-cases";
import { PROJECT_DASHBOARD } from "../_data/dashboard";
import { DIAGRAM_NODES } from "../_data/diagram";

// Frozen automation skeleton — VERSION 11. Header/footer come from the Projects-zone layout (step 213).
// A project is BORN with the automation menu (top right): Settings (AI model + input channels) and
// Tests — BOTH declaration-driven, so a model developing this automation sees and learns the standard
// from the first minute, BEFORE adapting anything to a real scenario. Grow it by filling
// _data/channels.ts and _data/tests.ts, then adding real nodes — see app/(projects)/README.md
// "The settings & tests declaration standard".
export default function AutomationEntry() {
  const d = PROJECT_DESCRIPTION;
  // A CHAINED automation (step 238) is a canvas-only container, not a workflow — it has nothing of its own
  // to build, so the generic Input/Logic/Output draft diagram below is meaningless for it. Its own page
  // shows GroupDetailSection instead: the same chain-brief editor + expanded member-automation nodes the
  // root canvas's eye icon and side panel already use — never a second implementation of either.
  const isGroup = AUTOMATION_TYPE === "chained";
  return (
    // PAGE ORDER (owner's requirement, step 243.1): status bar (breadcrumb/indicator/menu) FIRST, then the
    // development-wave NOTIFICATION, then the launch console, THEN the title — in that order, every time.
    // The banner/console used to be mounted by the projects-zone layout, ABOVE this whole file (step 241
    // E3.1) — that put them ABOVE the status bar, which the owner rejected. They are rendered HERE now, so
    // this exact order is what EVERY future automation is born with; the layout only provides the
    // WaveLockProvider context (one poll for the whole page) — see automation-page-chrome.client.tsx.
    <>
      {/* The cron slider (owner, 2026-07-15) — a 2px full-bleed orange bar at the very top that shrinks
          left→right over one cron period, then resets. It renders ONLY while this automation's cron is
          ACTIVE (the Cron accordion's enabled switch); off = no bar. It updates live when the switch flips.
          Full-bleed on purpose, so it sits ABOVE the centered <main>. */}
      <CronProgressBar automation="{{CATEGORY}}/{{PROJECT}}" />
      <main className="mx-auto w-[85vw] max-w-full space-y-4 px-4 pt-8">
        <AutomationStatusBar
          category="{{CATEGORY}}"
          categoryLabel={{CATEGORY_LABEL_JSON}}
          modelEnvKey="{{MODEL_ENV_KEY}}"
          defaultModel="gpt-4o-mini"
          channels={INPUT_CHANNELS}
          probes={PROBES}
          automation="{{CATEGORY}}/{{PROJECT}}"
          type={AUTOMATION_TYPE}
          entitiesSeed={PROJECT_CONFIG.entities}
        />
        {/* The ONLY launcher of development (step 240): appears the moment anything is staged. */}
        <DevelopmentWaveBanner automation="{{CATEGORY}}/{{PROJECT}}" />
        {/* PHASE 2 (step 227) — on the FIRST visit the activation Quiz opens and brainstorms the owner's
            instruction into nodes: one quiz step = one node + one development step for the coding agent. */}
        <ActivationQuiz automation="{{CATEGORY}}/{{PROJECT}}" />
        {/* Title + description. The "Add or modify automation" button that used to sit here is GONE (owner's
            requirement, step 240): development is launched in exactly ONE place — the wave banner above — and
            the automation is designed in the diagram's Builder and the entity panels. */}
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold">{d.title}</h1>
          <p className="max-w-3xl text-muted-foreground">{d.description}</p>
        </div>
      </main>
      {/* The launch control panel (step 241 E3, generalized to \`stream\` in step 243) — renders itself only
          for an INSTANCED or STREAM automation whose activation is declared; empty (null) otherwise. Its own
          full-width section, so it sits OUTSIDE the \`<main>\` above (not nested inside it). */}
      <ActivationLayer automation="{{CATEGORY}}/{{PROJECT}}" />
      {/* The Diagram is ALWAYS visible — full screen width, 80vh — NOT an accordion (owner design,
          step 223.C). It is the automation's centerpiece; the node panel opens on click. A CHAINED
          automation shows GroupDetailSection here instead (step 238) — see the isGroup comment above. */}
      {isGroup ? (
        <GroupDetailSection automation="{{CATEGORY}}/{{PROJECT}}" />
      ) : (
        <DiagramSection nodes={DIAGRAM_NODES} automation="{{CATEGORY}}/{{PROJECT}}" />
      )}
      <main className="mx-auto w-[85vw] max-w-full space-y-8 px-4 py-8">
        {/* The OTHER entity accordions (step 222) + the mandatory Use cases. The Diagram is above,
            outside the accordion series. Driven by _data/config.ts + _data/use-cases.ts. */}
        <AutomationAccordions
          config={PROJECT_CONFIG.entities}
          cases={USE_CASES}
          automation="{{CATEGORY}}/{{PROJECT}}"
          dashboard={PROJECT_DASHBOARD}
          type={AUTOMATION_TYPE}
        />
        {/* The "This is a frozen automation skeleton" intro blurb was REMOVED here (owner, step 241). */}
      </main>
    </>
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
driven by \`_data/config.ts\` (\`entities\`) — ALL switches are ON at birth (owner, 2026-07-16): every
surface is visible from the start (Calendar and Cron are real, not empty containers — a static demo
preview and a real periodicity control; Map / Processes / Analytics are EMPTY containers with a hover
tooltip until their interface is built), and the owner switches OFF in the hamburger menu whatever this
automation does not need; and the mandatory USER CASES
(\`_data/use-cases.ts\`), numbered (01, 02, …) with a status badge,
seeded with one case ("Architect planned the automation" / new). Break the request into cases and move
each from "new" to "in use" over short iterations. Full rules: app/(projects)/README.md,
"The automation entities standard".

**If this automation's type is Stream (step 243):** it was born with a REAL, working three-node example
already wired below (not empty drafts) — a launch console that already answers, and a dashboard table that
already records successful runs. Read the Diagram and \`_data/activation.ts\`/\`_data/dashboard.ts\` BEFORE
adding anything: the fastest path is almost always ADAPTING these three nodes for the real task, not
starting from zero. (Instanced/Chained automations still start from empty drafts you build in the Builder.)

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

## Behind a node — the node → functions contract
A node is a TYPED CONTAINER of the application's own functions. It stores name + description + typed
input/output params + conditions; the right-hand panel shows name/description directly and, in
pre-closed accordions, the system INSTRUCTION that generated the functions and one card per FUNCTION
(its typed inputs/return). A node's functions are DETERMINISTIC application code — running the AI inside
the application is forbidden; the AI is allowed only as an explicit external tool-call step of a node
(e.g. image/text generation). A node that is executing gets a bold orange frame, driven by the run's
current_node (DB-backed, not a client flag). Runtime state lives in automation_runs / automation_run_nodes
(current_node + per-node status) — that is how "which node is working now" is answered, via the
automation's own API.

🔴 CRITICAL INVARIANT (co-location) — a node's functions live ONLY in _nodes/<nodeId>/ inside THIS
project. No shared/common directory, ever. Delete the automation → every function vanishes without a
trace and with zero technical debt. Never lift a node's functions into a shared lib. Full rules +
example + the machine-validated enforcement (later step): app/(projects)/README.md,
"The node → functions contract".

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

// ─────────────────────────────────────────────────────────────────────────────
// TYPE-SPECIFIC STARTING PATTERN (step 243 — owner's correction after 241/242: a fresh automation must NOT
// hand a coding agent three confusing, unbuilt RED nodes and make it invent the whole architecture from
// nothing. It must hand a REAL, WORKING example of the full pattern — a diagram of real (non-draft) nodes,
// a real launch console, a real dashboard table — so the agent's job is to ADAPT it for the owner's actual
// task, never to invent the shape of "how does an automation work" from scratch.
//
// `type==="stream"` gets the REAL pattern below (a stock-price lookup: parse → external HTTP call → record
// on success). `instanced`/`chained` still get the OLD generic draft nodes for now — steps 244/245 give
// them their own equally real starting patterns; this is NOT "done for all three" yet, only for stream.
// ─────────────────────────────────────────────────────────────────────────────

const DRAFT_NODE_FILES: Record<string, string> = {
  "_data/diagram.ts": `import { assembleNode, type NodeContract } from "../../../_shared/node-contract";
import { META as m_input } from "../_nodes/input/meta";
import { FUNCTIONS as f_input } from "../_nodes/input/functions";
import { META as m_logic } from "../_nodes/logic/meta";
import { FUNCTIONS as f_logic } from "../_nodes/logic/functions";
import { META as m_output } from "../_nodes/output/meta";
import { FUNCTIONS as f_output } from "../_nodes/output/functions";

// This automation's MASTER diagram nodes (frozen standard, step 223.C/224 — see app/(projects)/README.md).
// The diagram is the SINGLE source of truth; a node exists ONLY here + its co-located _nodes/<slug>/ folder.
//
// DEFAULT for instanced/chained (step 224; stream gets a REAL pattern instead, step 243): every fresh
// automation starts with THREE generic nodes — Input → Logic → Output — as DRAFTS (empty functions + a
// spec.md brief), because before a real task exists there is nothing built yet. So a fresh project is born
// "In development" until you build its nodes in the Builder (pull a node, write its brief, Start
// development). This file is REGENERATED by the Builder as nodes are added/removed.
export const DIAGRAM_NODES: NodeContract[] = [
  assembleNode(m_input, f_input),
  assembleNode(m_logic, f_logic),
  assembleNode(m_output, f_output),
];
`,
  "_nodes/input/meta.ts": `import type { NodeMeta } from "../../../../_shared/node-contract";

// Default draft node (step 224). Not built yet — empty functions + spec.md; a red frame; ignored by
// execution. Build it in the Builder or delete it. The cuid is the stable identity for version history.
export const META: NodeMeta = {
  id: "input",
  cuid: "{{CUID_INPUT}}",
  name: "Input",
  role: "input",
  ioType: "control-panel",
  description: "Where the automation receives its work — a message, a request, or a scheduled tick.",
  in: {},
  out: { payload: "unknown" },
  run: "sequential",
  draft: true,
  estDurationMs: 60000,
};
`,
  "_nodes/input/functions.ts": `import type { NodeFunction } from "../../../../_shared/node-contract";

// Draft — no functions yet. The coder materializes these from spec.md (step 224).
export const FUNCTIONS: NodeFunction[] = [];
`,
  "_nodes/input/spec.md": `This node receives the automation's work — a message, a request, or a scheduled tick. Describe what triggers it and what payload it produces, then Start development to build it.
`,
  "_nodes/logic/meta.ts": `import type { NodeMeta } from "../../../../_shared/node-contract";

// Default draft node (step 224). Not built yet — empty functions + spec.md; a red frame; ignored by
// execution. Split it into real, named nodes as the automation is designed from the user cases.
export const META: NodeMeta = {
  id: "logic",
  cuid: "{{CUID_LOGIC}}",
  name: "Logic",
  role: "intermediate",
  description: "The middle — the deterministic work that turns the input into the output.",
  in: { payload: "unknown" },
  out: { result: "unknown" },
  run: "sequential",
  draft: true,
  estDurationMs: 60000,
};
`,
  "_nodes/logic/functions.ts": `import type { NodeFunction } from "../../../../_shared/node-contract";

// Draft — no functions yet. The coder materializes these from spec.md (step 224).
export const FUNCTIONS: NodeFunction[] = [];
`,
  "_nodes/logic/spec.md": `This node is the middle — the deterministic work that turns the input into the result. As the automation is designed from the user cases, split it into real, named nodes, each a typed container of functions.
`,
  "_nodes/output/meta.ts": `import type { NodeMeta } from "../../../../_shared/node-contract";

// Default draft node (step 224). Not built yet — empty functions + spec.md; a red frame; ignored by
// execution. Build it in the Builder or delete it.
export const META: NodeMeta = {
  id: "output",
  cuid: "{{CUID_OUTPUT}}",
  name: "Output",
  role: "output",
  ioType: "dashboard",
  description: "Where the automation delivers its result — a reply, a saved record, or a published page.",
  in: { result: "unknown" },
  out: {},
  run: "sequential",
  draft: true,
  estDurationMs: 60000,
};
`,
  "_nodes/output/functions.ts": `import type { NodeFunction } from "../../../../_shared/node-contract";

// Draft — no functions yet. The coder materializes these from spec.md (step 224).
export const FUNCTIONS: NodeFunction[] = [];
`,
  "_nodes/output/spec.md": `This node delivers the automation's result — a reply, a saved record, or a published page. Describe where and how the result is delivered, then Start development to build it.
`,
};

const DRAFT_ACTIVATION_FILE = `import { EMPTY_ACTIVATION, type ActivationSchema } from "../../../_shared/activation";

// THIS AUTOMATION'S ACTIVATION (frozen standard, step 241 E3) — what ONE RUN of it takes.
//
// EMPTY BY DESIGN, like _data/channels.ts and _data/tests.ts: the product cannot know, and must never
// presume, what a given automation's run needs. The coding agent determines the parameters while designing
// this automation's architecture (from the owner's brief in the Fork activation panel) and declares them
// HERE. The launch control panel then renders itself from this file: a working control panel is written as
// DATA, never as UI. Full contract + worked example: app/(projects)/README.md, "The activation (launch
// console) standard".
export const ACTIVATION: ActivationSchema = EMPTY_ACTIVATION;
`;

const DRAFT_DASHBOARD_FILE = `import type { DashboardConfig } from "../../../_shared/table-config";

// This automation's DASHBOARD (frozen standard, step 228 — see app/(projects)/README.md, "The dashboard
// tables & columns standard"). ONE tab, ANY number of tables; a column is DATA, not JSX — the shared table
// renders whatever this declares through a closed set of typed cells. Seeded with ONE demo table so the
// dashboard is not empty at birth; when the automation is designed (Quiz / decomposition, step 227), the
// model adds the tables it actually needs to analyse its work, by this same standard. The rows[] here are
// DEMO seed (step 229): once a real row is written (the nodes via POST /api/projects/dashboard/rows, or the
// owner via "Add row"), the LIVE rows replace this seed — data lives in the DB, so live rows need no rebuild.
export const PROJECT_DASHBOARD: DashboardConfig = {
  tables: [
    {
      id: "records",
      title: "Records",
      description: "A demo table — replace its columns and rows with what this automation produces.",
      columns: [
        { id: "status", header: "Status", type: "badge", source: "status", defaultVisible: true, options: { colorFrom: "color" } },
        { id: "title", header: "Title", type: "text", source: "title", defaultVisible: true },
        { id: "note", header: "Note", type: "longtext", source: "note", defaultVisible: true, options: { expand: true } },
        { id: "when", header: "When", type: "date", source: "when", defaultVisible: true },
        { id: "details", header: "", type: "actions", source: "id", defaultVisible: true, options: { action: "detail" } },
      ],
      rows: [
        { id: "1", values: { status: "new", color: "blue", title: "First item", note: "A sample row so the table is not empty. Click to expand this note.", when: "2026-07-13T09:00:00Z" } },
        { id: "2", values: { status: "done", color: "green", title: "Second item", note: "Another sample row.", when: "2026-07-10T18:30:00Z" } },
      ],
    },
  ],
};
`;

// STREAM'S REAL STARTING PATTERN (step 243) — a working, non-draft, three-node automation (stock-price
// lookup): parse the free-text ask against a small dictionary → a real external HTTP call (no AI) → record
// the result ONLY on success. Read app/(projects)/README.md "The activation (launch console) standard" for
// why this shape (multi-function node, plain-HTTP node, success-gated write) is worth copying, then ADAPT
// these three nodes for the owner's real task — rename them, change what they check/call/write, keep the
// contract. This is a demonstration to build on, not a fixture to preserve.
const STREAM_NODE_FILES: Record<string, string> = {
  "_data/diagram.ts": `import { assembleNode, type NodeContract } from "../../../_shared/node-contract";
import { META as parseMeta } from "../_nodes/parse-request/meta";
import { FUNCTIONS as parseFns } from "../_nodes/parse-request/functions";
import { INSTRUCTION as parseInstruction } from "../_nodes/parse-request/instruction";
import { META as lookupMeta } from "../_nodes/lookup-price/meta";
import { FUNCTIONS as lookupFns } from "../_nodes/lookup-price/functions";
import { INSTRUCTION as lookupInstruction } from "../_nodes/lookup-price/instruction";
import { META as recordMeta } from "../_nodes/record-result/meta";
import { FUNCTIONS as recordFns } from "../_nodes/record-result/functions";
import { INSTRUCTION as recordInstruction } from "../_nodes/record-result/instruction";
import { META as ifSuccessMeta } from "../_nodes/if-success/meta";
import { FUNCTIONS as ifSuccessFns } from "../_nodes/if-success/functions";
import { META as ifNotExistsMeta } from "../_nodes/if-not-exists/meta";
import { FUNCTIONS as ifNotExistsFns } from "../_nodes/if-not-exists/functions";

// STARTING PATTERN (step 243) — a REAL, working Stream automation, not empty drafts. Read
// app/(projects)/README.md "The activation (launch console) standard" first, then ADAPT these nodes for the
// owner's actual task (rename them, change what they do) — keep the SHAPE: sequential, a multi-function node,
// a plain external call, a write gated by success. The two CONDITION nodes (2026-07-15) branch off the lookup:
// "If success" carries the flow into the output node, "If not exists" is a dead end (for now) — they read the
// automation's control flow ON the diagram. They are visual no-ops today (pass-through); the real success/
// failure gating still comes from lookup-price throwing on no price, so a failed ask never records a row.
export const DIAGRAM_NODES: NodeContract[] = [
  assembleNode(parseMeta, parseFns, parseInstruction),
  assembleNode(lookupMeta, lookupFns, lookupInstruction),
  assembleNode(ifSuccessMeta, ifSuccessFns),
  assembleNode(ifNotExistsMeta, ifNotExistsFns),
  assembleNode(recordMeta, recordFns, recordInstruction),
];
`,
  "_nodes/parse-request/meta.ts": `import type { NodeMeta } from "../../../../_shared/node-contract";

// STARTING PATTERN node (step 243) — real, not draft. Adapt freely for the owner's real task.
export const META: NodeMeta = {
  id: "parse-request",
  cuid: "{{CUID_PARSE}}",
  name: "Parse the request",
  role: "input",
  ioType: "control-panel",
  description: "Recognizes a known company in the owner's free-text ask and resolves it to a ticker.",
  in: { query: "string" },
  out: { company: "string", ticker: "string" },
  conditions: ["query mentions a company from the small known-company dictionary"],
  run: "sequential",
  estDurationMs: 20,
};
`,
  "_nodes/parse-request/functions.ts": `import type { NodeFunction } from "../../../../_shared/node-contract";

// STARTING PATTERN (step 243) — deterministic, no AI. A small CLOSED dictionary of well-known public
// companies + a couple of common aliases. Deliberately NOT an intent classifier: a request that mentions no
// known company gets the SAME honest rejection whether it's an unrelated question or a company outside this
// tiny demo dictionary. ADAPT this for the real task: replace the dictionary/lookup with whatever the
// automation actually needs to recognize — keep the two-function shape (extract → resolve) if it fits.
type CompanyEntry = { display: string; ticker: string | null };

// \`ticker: null\` marks a real, well-known company that is simply not publicly traded — kept here on
// PURPOSE as a demonstration of a realistic, specific rejection path (not a generic "unrecognized").
const COMPANIES: Record<string, CompanyEntry> = {
  apple: { display: "Apple", ticker: "AAPL" },
  tesla: { display: "Tesla", ticker: "TSLA" },
  microsoft: { display: "Microsoft", ticker: "MSFT" },
  google: { display: "Google", ticker: "GOOGL" },
  amazon: { display: "Amazon", ticker: "AMZN" },
  nvidia: { display: "Nvidia", ticker: "NVDA" },
  spacex: { display: "SpaceX", ticker: null },
  "space x": { display: "SpaceX", ticker: null },
};

/** Finds the first known company mentioned in free text (case-insensitive substring match) and returns its
 *  dictionary key. Throws when none is found. */
export async function extractCompanyMention(query: string): Promise<{ companyKey: string }> {
  const q = query.toLowerCase();
  for (const key of Object.keys(COMPANIES)) {
    if (q.includes(key)) return { companyKey: key };
  }
  // TEN LANGUAGES (step 243.4, rule 4г): a node's thrown message is normally a plain string (a real
  // automation's own language) — but OUR OWN starting pattern's user-facing errors are our default content,
  // so they throw JSON.stringify({en,ru,...}) instead. The shared ActivationLayer already recognizes this
  // shape (resolveErrorText, _shared/localized-text.ts) and resolves it; a plain string still works exactly
  // as before for any node that does not bother.
  throw new Error(JSON.stringify({
    en: "Could not recognize a supported company in your request.",
    ru: "Не удалось распознать компанию по акциям в вашем запросе.",
    es: "No se pudo reconocer una empresa admitida en tu solicitud.",
    fr: "Impossible de reconnaître une entreprise prise en charge dans votre demande.",
    it: "Impossibile riconoscere un'azienda supportata nella tua richiesta.",
    de: "In Ihrer Anfrage konnte kein unterstütztes Unternehmen erkannt werden.",
    pt: "Não foi possível reconhecer uma empresa suportada no seu pedido.",
    pl: "Nie udało się rozpoznać obsługiwanej firmy w Twoim zapytaniu.",
    tr: "İsteğinizde desteklenen bir şirket tanınamadı.",
    nl: "Kon geen ondersteund bedrijf herkennen in uw verzoek.",
  }));
}

/** Maps a recognized company key to its ticker. Throws a SPECIFIC message for a known-but-private company. */
export async function resolveTicker(companyKey: string): Promise<{ company: string; ticker: string }> {
  const entry = COMPANIES[companyKey];
  if (!entry) throw new Error(\`Unknown company key "\${companyKey}".\`);
  if (!entry.ticker) {
    const name = entry.display;
    throw new Error(JSON.stringify({
      en: \`\${name} is privately held — it has no public stock price.\`,
      ru: \`\${name} — частная компания, у неё нет публичной цены акций.\`,
      es: \`\${name} es una empresa privada — no tiene precio de acción público.\`,
      fr: \`\${name} est une entreprise privée — elle n'a pas de prix d'action public.\`,
      it: \`\${name} è un'azienda privata — non ha un prezzo azionario pubblico.\`,
      de: \`\${name} ist privat gehalten — es gibt keinen öffentlichen Aktienkurs.\`,
      pt: \`\${name} é uma empresa privada — não tem preço de ação público.\`,
      pl: \`\${name} jest spółką prywatną — nie ma publicznej ceny akcji.\`,
      tr: \`\${name} özel bir şirkettir — halka açık hisse fiyatı yoktur.\`,
      nl: \`\${name} is een particulier bedrijf — er is geen publieke aandelenkoers.\`,
    }));
  }
  return { company: entry.display, ticker: entry.ticker };
}

export const FUNCTIONS: NodeFunction[] = [
  {
    name: "extractCompanyMention",
    paramsIn: { query: "string" },
    returns: "{ companyKey: string }",
    rules: ["deterministic; no AI inside the app", "throws when no known company is mentioned"],
  },
  {
    name: "resolveTicker",
    paramsIn: { companyKey: "string" },
    returns: "{ company: string; ticker: string }",
    rules: ["throws a specific message for a known-but-private company"],
  },
];
`,
  "_nodes/parse-request/instruction.ts": `// The system instruction that generated this node's functions (co-located per node, step 243).
export const INSTRUCTION = \`Build deterministic functions that recognize a known item in the owner's
free-text ask and resolve it to what the next node needs. Do NOT attempt intent classification — a
request outside the small dictionary must be rejected the same honest way whether it is off-topic or
just unlisted. Every function must be typed (inputs and return) and scoped to this node.\`;
`,
  "_nodes/lookup-price/meta.ts": `import type { NodeMeta } from "../../../../_shared/node-contract";

// STARTING PATTERN node (step 243) — real, not draft. The first plain external HTTP call in this
// automation's diagram (no AI) — adapt the endpoint/logic for the owner's real task.
export const META: NodeMeta = {
  id: "lookup-price",
  cuid: "{{CUID_LOOKUP}}",
  name: "Look up the price",
  role: "intermediate",
  parentId: "parse-request",
  description: "Calls the free Yahoo Finance quote endpoint for the resolved ticker.",
  in: { ticker: "string" },
  out: { price: "number", asOf: "ISODate" },
  conditions: ["ticker was resolved by the previous node", "the quote service returns a live price"],
  run: "sequential",
  estDurationMs: 800,
};
`,
  "_nodes/lookup-price/functions.ts": `import type { NodeFunction } from "../../../../_shared/node-contract";

// STARTING PATTERN (step 243) — a plain external HTTP fetch, no AI. Deterministic, throws loudly on
// failure, never silently succeeds. ADAPT the endpoint/logic for the owner's real task — keep the shape:
// one clear external call, a typed return, a thrown error when nothing usable came back.
export type PriceQuote = { price: number; asOf: string };

function yahooChartUrl(ticker: string): string {
  return \`https://query1.finance.yahoo.com/v8/finance/chart/\${encodeURIComponent(ticker)}\`;
}

export async function fetchPrice(ticker: string): Promise<PriceQuote> {
  const r = await fetch(yahooChartUrl(ticker), {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FracteraStockPriceLookup/1.0)" },
    cache: "no-store",
  });
  // TEN LANGUAGES (step 243.4, rule 4г) — see the identical note in parse-request/functions.ts.
  if (!r.ok) {
    const status = r.status;
    throw new Error(JSON.stringify({
      en: \`The quote service returned an error (\${status}) for "\${ticker}".\`,
      ru: \`Сервис котировок вернул ошибку (\${status}) для «\${ticker}».\`,
      es: \`El servicio de cotizaciones devolvió un error (\${status}) para «\${ticker}».\`,
      fr: \`Le service de cotation a renvoyé une erreur (\${status}) pour « \${ticker} ».\`,
      it: \`Il servizio quotazioni ha restituito un errore (\${status}) per «\${ticker}».\`,
      de: \`Der Kursdienst hat einen Fehler (\${status}) für „\${ticker}\\" zurückgegeben.\`,
      pt: \`O serviço de cotações devolveu um erro (\${status}) para «\${ticker}».\`,
      pl: \`Usługa notowań zwróciła błąd (\${status}) dla „\${ticker}\\".\`,
      tr: \`"\${ticker}" için fiyat servisi bir hata (\${status}) döndürdü.\`,
      nl: \`De koersendienst gaf een fout (\${status}) voor "\${ticker}".\`,
    }));
  }
  const data = (await r.json().catch(() => null)) as
    | { chart?: { result?: { meta?: { regularMarketPrice?: number } }[] } }
    | null;
  const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (typeof price !== "number") {
    throw new Error(JSON.stringify({
      en: \`No live price was returned for "\${ticker}".\`,
      ru: \`Для «\${ticker}» не пришла актуальная цена.\`,
      es: \`No se recibió un precio en vivo para «\${ticker}».\`,
      fr: \`Aucun cours en direct n'a été renvoyé pour « \${ticker} ».\`,
      it: \`Nessun prezzo in tempo reale restituito per «\${ticker}».\`,
      de: \`Für „\${ticker}\\" wurde kein aktueller Kurs zurückgegeben.\`,
      pt: \`Não foi devolvido um preço em tempo real para «\${ticker}».\`,
      pl: \`Nie zwrócono aktualnej ceny dla „\${ticker}\\".\`,
      tr: \`"\${ticker}" için canlı fiyat alınamadı.\`,
      nl: \`Er is geen actuele koers ontvangen voor "\${ticker}".\`,
    }));
  }
  return { price, asOf: new Date().toISOString() };
}

export const FUNCTIONS: NodeFunction[] = [
  {
    name: "fetchPrice",
    paramsIn: { ticker: "string" },
    returns: "PriceQuote",
    rules: ["deterministic; no AI inside the app", "throws when the quote service has no live price for this ticker"],
  },
];
`,
  "_nodes/lookup-price/instruction.ts": `// The system instruction that generated this node's functions (co-located per node, step 243).
export const INSTRUCTION = \`Build a deterministic function that fetches CURRENT data from a free,
keyless external service (no AI, no fabricated values). Throw a clear error when the service does not
return something usable — a step that found nothing must never report success. Every function must be
typed (inputs and return) and scoped to this node.\`;
`,
  "_nodes/record-result/meta.ts": `import type { NodeMeta } from "../../../../_shared/node-contract";

// STARTING PATTERN node (step 243) — real, not draft. The automation's OUTPUT node: reached ONLY when
// both previous nodes succeeded (the executor stops the run at the first throw) — which is exactly what
// makes "a failed ask never writes a row" true, with no special-casing in the executor itself.
export const META: NodeMeta = {
  id: "record-result",
  cuid: "{{CUID_RECORD}}",
  name: "Record the result",
  role: "output",
  ioType: "dashboard",
  parentId: "if-success",
  description: "Writes the successful lookup into this automation's History dashboard table.",
  in: { company: "string", ticker: "string", price: "number" },
  out: { rowId: "string" },
  conditions: ["reached only after a successful lookup"],
  run: "sequential",
  estDurationMs: 20,
};
`,
  "_nodes/record-result/functions.ts": `import type { NodeFunction } from "../../../../_shared/node-contract";
import { addRow } from "@/lib/dashboard-rows";

// STARTING PATTERN (step 243) — writes through the EXISTING rows API (steps 228/229 — lib/dashboard-rows.ts,
// the same store the owner's "Add row" writes to), never a bespoke table. ADAPT the fields for the owner's
// real task — keep this node LAST, so it is reached only when every earlier node succeeded.
export async function recordLookup(company: string, ticker: string, price: number): Promise<{ rowId: string }> {
  const row = await addRow("{{CATEGORY}}/{{PROJECT}}", "history", {
    date: new Date().toISOString(),
    company,
    ticker,
    price,
  });
  return { rowId: row.id };
}

export const FUNCTIONS: NodeFunction[] = [
  {
    name: "recordLookup",
    paramsIn: { company: "string", ticker: "string", price: "number" },
    returns: "{ rowId: string }",
    rules: ["deterministic; no AI inside the app", "reached only when every earlier node succeeded"],
  },
];
`,
  "_nodes/record-result/instruction.ts": `// The system instruction that generated this node's functions (co-located per node, step 243).
export const INSTRUCTION = \`Build a deterministic function that writes a successful result into this
automation's own dashboard rows store (through the existing rows API — never a bespoke table). This node
must be the LAST one, so it is reached only after every earlier node succeeded. Every function must be
typed (inputs and return) and scoped to this node.\`;
`,
  // ── THE TWO CONDITION NODES (2026-07-15) — square gates that branch off lookup-price on the diagram ──────
  "_nodes/if-success/meta.ts": `import type { NodeMeta } from "../../../../_shared/node-contract";

// CONDITION node — the SUCCESS branch off lookup-price: carries the flow into the output node. It is the
// condition KIND of an intermediate node (role "intermediate", ioType "condition"), which is what draws it as
// a SQUARE on the diagram; keep its label SHORT — it is read at a glance. Visual pass-through for now; the
// real success/failure gating is lookup-price throwing on no price.
export const META: NodeMeta = {
  id: "if-success",
  cuid: "{{CUID_IF_SUCCESS}}",
  name: "If success",
  role: "intermediate",
  ioType: "condition",
  parentId: "lookup-price",
  description: "The branch taken when a live price was found — the flow continues to the output node.",
  in: { price: "number" },
  out: { price: "number" },
  conditions: ["a live price was returned"],
  run: "sequential",
  estDurationMs: 5,
};
`,
  "_nodes/if-success/functions.ts": `import type { NodeFunction } from "../../../../_shared/node-contract";

// Visual condition node — a pass-through gate. Forwards the price unchanged; the real decision is made
// upstream by lookup-price throwing when there is no price. When condition nodes are standardized, this
// becomes the real conditional-routing check.
export async function whenPriceFound(price: number): Promise<{ price: number }> {
  return { price };
}

export const FUNCTIONS: NodeFunction[] = [
  {
    name: "whenPriceFound",
    paramsIn: { price: "number" },
    returns: "{ price: number }",
    rules: ["visual condition (pass-through) — carries a successful lookup forward to the output node"],
  },
];
`,
  "_nodes/if-not-exists/meta.ts": `import type { NodeMeta } from "../../../../_shared/node-contract";

// CONDITION node — the FAILURE branch off lookup-price: taken when the company has no public stock. A dead
// end for now (other conditions could leave it later). The condition KIND of an intermediate node (role
// "intermediate", ioType "condition") — drawn as a SQUARE on the diagram; short label.
export const META: NodeMeta = {
  id: "if-not-exists",
  cuid: "{{CUID_IF_NOT_EXISTS}}",
  name: "If not exists",
  role: "intermediate",
  ioType: "condition",
  parentId: "lookup-price",
  description: "The branch taken when no public stock exists for the request — the automation ends here.",
  in: {},
  out: {},
  conditions: ["no live price for the ticker"],
  run: "sequential",
  estDurationMs: 5,
};
`,
  "_nodes/if-not-exists/functions.ts": `import type { NodeFunction } from "../../../../_shared/node-contract";

// Visual condition node — a no-op dead end. It does nothing: on a real failure lookup-price has already
// thrown and stopped the run before this point, so no row is ever written down this branch.
export async function whenNotFound(): Promise<Record<string, never>> {
  return {};
}

export const FUNCTIONS: NodeFunction[] = [
  {
    name: "whenNotFound",
    paramsIn: {},
    returns: "{}",
    rules: ["visual condition (no-op) — the dead-end branch when no stock exists"],
  },
];
`,
};

const STREAM_ACTIVATION_FILE = `import type { ActivationSchema } from "../../../_shared/activation";

// STARTING PATTERN (step 243) — NOT empty: this is what makes the launch console (below the diagram) work
// the moment this automation is created. The key ("query") matches "parse-request"'s first function's
// paramsIn — that is the whole wiring. Full contract: app/(projects)/README.md, "The activation (launch
// console) standard". ADAPT this for the owner's real task — change the label/help, add/remove params —
// keeping each \`key\` in sync with whatever the first node's paramsIn expects.
//
// TEN LANGUAGES (step 243.2, rule 4г): this is OUR own default content, not a real automation's — title/
// description/label/help are {en,ru,...} maps, resolved at render time (see _shared/localized-text.ts). A
// real automation a coding agent designs later may keep it simple and just write ONE string in the owner's
// own language — the type accepts both.
export const ACTIVATION: ActivationSchema = {
  title: {
    en: "Ask for a stock price", ru: "Спросить цену акции", es: "Preguntar el precio de una acción",
    fr: "Demander le prix d'une action", it: "Chiedi il prezzo di un'azione", de: "Nach einem Aktienkurs fragen",
    pt: "Perguntar o preço de uma ação", pl: "Zapytaj o cenę akcji", tr: "Hisse fiyatı sor", nl: "Vraag naar een aandelenkoers",
  },
  description: {
    en: "Name a public company (e.g. \\"how much is Apple stock\\") and get its current price.",
    ru: "Назовите публичную компанию (например, «сколько стоит акция Apple») и получите её текущую цену.",
    es: "Nombra una empresa pública (p. ej. «cuánto vale la acción de Apple») y obtén su precio actual.",
    fr: "Nommez une entreprise cotée (p. ex. « combien vaut l'action Apple ») et obtenez son prix actuel.",
    it: "Indica un'azienda quotata (es. «quanto vale l'azione Apple») e ottieni il suo prezzo attuale.",
    de: "Nennen Sie ein börsennotiertes Unternehmen (z. B. „wie viel kostet die Apple-Aktie\\") und erhalten Sie den aktuellen Kurs.",
    pt: "Indique uma empresa pública (ex.: «quanto vale a ação da Apple») e obtenha o preço atual.",
    pl: "Podaj spółkę giełdową (np. „ile kosztuje akcja Apple\\") i uzyskaj jej aktualną cenę.",
    tr: "Halka açık bir şirket adı verin (ör. \\"Apple hissesi ne kadar\\") ve güncel fiyatını öğrenin.",
    nl: "Noem een beursgenoteerd bedrijf (bijv. \\"wat kost het Apple-aandeel\\") en krijg de actuele koers.",
  },
  params: [
    {
      key: "query",
      label: {
        en: "Your question", ru: "Ваш вопрос", es: "Tu pregunta", fr: "Votre question", it: "La tua domanda",
        de: "Ihre Frage", pt: "Sua pergunta", pl: "Twoje pytanie", tr: "Sorunuz", nl: "Uw vraag",
      },
      type: "longtext",
      required: true,
      help: {
        en: "Type or speak a company name — e.g. Apple, Tesla, SpaceX.",
        ru: "Введите или произнесите название компании — например, Apple, Tesla, SpaceX.",
        es: "Escribe o di el nombre de una empresa — p. ej. Apple, Tesla, SpaceX.",
        fr: "Tapez ou dites le nom d'une entreprise — p. ex. Apple, Tesla, SpaceX.",
        it: "Scrivi o pronuncia il nome di un'azienda — es. Apple, Tesla, SpaceX.",
        de: "Geben Sie den Namen eines Unternehmens ein oder sprechen Sie ihn — z. B. Apple, Tesla, SpaceX.",
        pt: "Digite ou fale o nome de uma empresa — ex.: Apple, Tesla, SpaceX.",
        pl: "Wpisz lub wypowiedz nazwę firmy — np. Apple, Tesla, SpaceX.",
        tr: "Bir şirket adı yazın veya söyleyin — örn. Apple, Tesla, SpaceX.",
        nl: "Typ of spreek een bedrijfsnaam in — bijv. Apple, Tesla, SpaceX.",
      },
    },
  ],
};
`;

const STREAM_DASHBOARD_FILE = `import type { DashboardConfig } from "../../../_shared/table-config";

// STARTING PATTERN (step 243) — a REAL table wired to what "record-result" actually writes, not a demo seed
// disconnected from the nodes. \`pageSize\` + the \`live\` action column are the step-243 upgrades to the
// universal table (pagination/search-debounce/live-refresh) — every automation gets them automatically the
// moment it declares them here; nothing to build. Full contract: app/(projects)/README.md, "The dashboard
// tables & columns standard". ADAPT the columns for the owner's real task.
//
// TEN LANGUAGES (step 243.2, rule 4г) — title/description/headers are {en,ru,...} maps, our own default
// content; resolved at render time (_shared/localized-text.ts). A real automation may just write one string.
export const PROJECT_DASHBOARD: DashboardConfig = {
  tables: [
    {
      id: "history",
      title: {
        en: "History", ru: "История", es: "Historial", fr: "Historique", it: "Cronologia",
        de: "Verlauf", pt: "Histórico", pl: "Historia", tr: "Geçmiş", nl: "Geschiedenis",
      },
      description: {
        en: "Every successful lookup. A failed ask is never recorded here.",
        ru: "Каждый успешный запрос. Неудачный запрос сюда никогда не записывается.",
        es: "Cada consulta exitosa. Una consulta fallida nunca se registra aquí.",
        fr: "Chaque recherche réussie. Une demande échouée n'est jamais enregistrée ici.",
        it: "Ogni ricerca riuscita. Una richiesta fallita non viene mai registrata qui.",
        de: "Jede erfolgreiche Abfrage. Eine fehlgeschlagene Anfrage wird hier nie aufgezeichnet.",
        pt: "Cada consulta bem-sucedida. Um pedido malsucedido nunca é registrado aqui.",
        pl: "Każde udane zapytanie. Nieudane zapytanie nigdy nie jest tu zapisywane.",
        tr: "Her başarılı sorgu. Başarısız bir istek buraya asla kaydedilmez.",
        nl: "Elke succesvolle opzoeking. Een mislukt verzoek wordt hier nooit vastgelegd.",
      },
      pageSize: 10,
      columns: [
        {
          id: "date", type: "date", source: "date", defaultVisible: true,
          header: { en: "Date", ru: "Дата", es: "Fecha", fr: "Date", it: "Data", de: "Datum", pt: "Data", pl: "Data", tr: "Tarih", nl: "Datum" },
        },
        {
          id: "company", type: "text", source: "company", defaultVisible: true,
          header: { en: "Company", ru: "Компания", es: "Empresa", fr: "Entreprise", it: "Azienda", de: "Unternehmen", pt: "Empresa", pl: "Firma", tr: "Şirket", nl: "Bedrijf" },
        },
        {
          id: "ticker", type: "text", source: "ticker", defaultVisible: true,
          header: { en: "Ticker", ru: "Тикер", es: "Ticker", fr: "Symbole", it: "Ticker", de: "Ticker", pt: "Ticker", pl: "Ticker", tr: "Sembol", nl: "Ticker" },
        },
        {
          id: "price", type: "number", source: "price", defaultVisible: true, options: { suffix: "$" },
          header: { en: "Price", ru: "Цена", es: "Precio", fr: "Prix", it: "Prezzo", de: "Preis", pt: "Preço", pl: "Cena", tr: "Fiyat", nl: "Prijs" },
        },
        {
          id: "live", header: "", type: "actions", source: "ticker", defaultVisible: true,
          // actionDescription (2026-07-16) — REQUIRED alongside every cell action: the plain-language
          // statement of what the opened modal does, read by a coding agent from the architecture bundle.
          options: {
            action: "live",
            liveUrl: "/api/projects/{{CATEGORY}}/{{PROJECT}}/price?ticker={ticker}",
            actionDescription: {
              en: "Opens a modal that fetches the CURRENT live price for this row's ticker (the stored price is a snapshot). Read-only.",
              ru: "Открывает модальное окно, которое запрашивает ТЕКУЩУЮ живую цену по тикеру строки (сохранённая цена — снимок). Только чтение.",
            },
          },
        },
      ],
      rows: [],
    },
  ],
};
`;

// The "live" action's thin, read-only, per-automation route (step 243) — written OUTSIDE projectsRoot
// (app/api/, not app/(projects)/projects/) since it is a served API route, not project content. Reuses the
// SAME fetchPrice function the "lookup-price" node calls — co-location preserved, deleting the automation
// deletes this route's target too.
const STREAM_PRICE_ROUTE = `import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { fetchPrice } from "@/app/(projects)/projects/{{CATEGORY}}/{{PROJECT}}/_nodes/lookup-price/functions";

// THE "LIVE" ACTION ROUTE for this automation's History table (step 243, table-config.ts \`action:"live"\`).
//   GET ?ticker=<symbol>  ->  { ticker, price, asOf }
// Thin and READ-ONLY: reuses the exact fetchPrice() the "lookup-price" node calls during a real run, but
// never records anything — the stored price is a snapshot, this proves the current value without a second row.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const ticker = (req.nextUrl.searchParams.get("ticker") ?? "").trim();
  if (!ticker) return NextResponse.json({ error: "missing ticker" }, { status: 400 });
  try {
    const quote = await fetchPrice(ticker);
    return NextResponse.json({ ticker, price: quote.price, asOf: quote.asOf });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "lookup failed" }, { status: 502 });
  }
}
`;

// THE CRON DECLARATION (Cron+Calendar step) — a co-located cron.json, exactly the shape fractera-cron
// already scans for on every 15s tick (services/cron/server.js — zero new scheduler infrastructure). ONE
// job, DISABLED by default (the owner turns it on from the new Cron accordion when ready) at a 5-minute
// default interval, pointed at this automation's OWN thin tick route below. `enabled` and `schedule` are
// read/written generically by /api/projects/settings/cron — that route does not need to know this job's
// `id`, but a predictable one keeps cron.json legible on disk.
const STREAM_CRON_JSON = `{
  "jobs": [
    {
      "id": "{{PROJECT}}-cron-tick",
      "title": "{{PROJECT}}: periodic tick (Cron entity — not yet wired to actuate anything)",
      "schedule": "*/5 * * * *",
      "action": {
        "type": "http",
        "url": "http://127.0.0.1:3003/api/projects/{{CATEGORY}}/{{PROJECT}}/cron-tick",
        "method": "POST",
        "body": {}
      },
      "enabled": false,
      "timeoutMs": 120000
    }
  ]
}
`;

// The Cron entity's own thin, per-automation tick route (Cron+Calendar step) — written OUTSIDE
// projectsRoot (app/api/, not app/(projects)/projects/), same reasoning as STREAM_PRICE_ROUTE: it is a
// served API route, not project content, so deleting the automation must delete this too. STUB on
// purpose: the owner scoped Cron and Calendar as two INDEPENDENT entities this step — no actuation logic
// exists yet to call from here (a later, separate integration step fills this in). What matters now is
// that the whole chain is real and reachable end to end: cron.json -> fractera-cron -> this route ->
// authorized 200, nothing left to wire except the body of this handler.
const STREAM_CRON_TICK_ROUTE = `import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";

// THE CRON TICK ROUTE for this automation (Cron entity). Called by fractera-cron per the schedule
// declared in this automation's own cron.json — the runner sends an agent identity header the shared
// authorize() gate already recognizes (same as every other cron-triggered project route).
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ ok: true, note: "no actuation wired yet — pending a later integration step" });
}
`;

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
  // Phase 1 (step 224 §1.5, extended 234.3): the immutable type + the owner's instruction (the seed the
  // activation Quiz, step 227, turns into nodes). The type defaults to "stream" (the simpler kind) when not
  // given or unrecognized.
  const type = input.type === "instanced" ? "instanced" : input.type === "chained" ? "chained" : "stream";
  const instruction =
    String(input.instruction ?? "").trim() ||
    "Not stated yet — describe what this automation must do.";
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
    // A fresh CUID per default node (step 224) — the stable identity that the DB canvas index + version
    // history join on. Generated per project creation so two projects never share a node identity.
    "{{CUID_INPUT}}": createNodeId(),
    "{{CUID_LOGIC}}": createNodeId(),
    "{{CUID_OUTPUT}}": createNodeId(),
    // The STREAM starting pattern's three REAL nodes (step 243) — same idea, only used when type==="stream".
    "{{CUID_PARSE}}": createNodeId(),
    "{{CUID_LOOKUP}}": createNodeId(),
    "{{CUID_RECORD}}": createNodeId(),
    // The two CONDITION nodes (2026-07-15) — the square gates branching off lookup-price.
    "{{CUID_IF_SUCCESS}}": createNodeId(),
    "{{CUID_IF_NOT_EXISTS}}": createNodeId(),
    // Phase 1 of an automation's birth (step 224 §1.5): the immutable type + the owner's instruction.
    "{{AUTOMATION_TYPE}}": type,
    "{{AUTOMATION_INSTRUCTION}}": instruction,
  };
  const sub = (s: string) => Object.entries(tokens).reduce((acc, [k, v]) => acc.split(k).join(v), s);

  // TYPE-SPECIFIC STARTING PATTERN (step 243): `stream` gets a REAL, working three-node example (see the
  // STREAM_* constants above); `instanced`/`chained` still get the old generic drafts until 244/245 give
  // them their own. Merged over the common SKELETON, never duplicated.
  const isStream = type === "stream";
  const fullSkeleton: Record<string, string> = {
    ...SKELETON,
    ...(isStream ? STREAM_NODE_FILES : DRAFT_NODE_FILES),
    "_data/activation.ts": isStream ? STREAM_ACTIVATION_FILE : DRAFT_ACTIVATION_FILE,
    "_data/dashboard.ts": isStream ? STREAM_DASHBOARD_FILE : DRAFT_DASHBOARD_FILE,
    // Cron declaration (Cron+Calendar step) — STREAM only for now, same scoping as the other real-node
    // starting patterns above; instanced/chained get their own cron.json once they get their own real
    // starting pattern (mirrors the STREAM_NODE_FILES precedent).
    ...(isStream ? { "cron.json": STREAM_CRON_JSON } : {}),
  };

  const files: string[] = [];
  for (const [rel, raw] of Object.entries(fullSkeleton)) {
    const body = sub(raw);
    const leftover = body.match(/\{\{[A-Z_]+\}\}/g);
    if (leftover) return { ok: false, error: `unsubstituted token(s) ${[...new Set(leftover)].join(", ")} in ${rel}` };
    const dest = join(destBase, rel);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, body, "utf8");
    files.push(`app/(projects)/projects/${category}/${project}/${rel}`);
  }

  // THE PER-AUTOMATION AGENT CANON (step 251) — every automation is born carrying its own agent
  // instruction: AGENTS.md (the cross-agent standard Codex/Kimi load) + CLAUDE.md (a byte-identical
  // mirror Claude Code loads), rendered from the ONE canon module (automation-agent-canon.ts, also
  // injected into the in-product developer's prompt). Written directly — no {{...}} tokens to leak.
  const canon = agentCanon({ category, project, title, type, modelEnvKey });
  for (const rel of ["AGENTS.md", "CLAUDE.md"]) {
    await writeFile(join(destBase, rel), canon, "utf8");
    files.push(`app/(projects)/projects/${category}/${project}/${rel}`);
  }

  // STREAM's launch-console "live" action needs its own thin, read-only route — served under app/api/, a
  // different root than projectsRoot (project CONTENT vs a served API route). Written only for stream; then
  // the executables registry is regenerated so the general executor can see the three real new nodes
  // immediately (the same regen the Builder's materialize step calls — step 241/243).
  if (isStream) {
    const apiRoot = join(process.cwd(), "app", "api", "projects", category, project, "price");
    await mkdir(apiRoot, { recursive: true });
    await writeFile(join(apiRoot, "route.ts"), sub(STREAM_PRICE_ROUTE), "utf8");
    files.push(`app/api/projects/${category}/${project}/price/route.ts`);

    // The Cron entity's own tick route (Cron+Calendar step) — same "outside projectsRoot" reasoning as
    // the price route above.
    const cronApiRoot = join(process.cwd(), "app", "api", "projects", category, project, "cron-tick");
    await mkdir(cronApiRoot, { recursive: true });
    await writeFile(join(cronApiRoot, "route.ts"), sub(STREAM_CRON_TICK_ROUTE), "utf8");
    files.push(`app/api/projects/${category}/${project}/cron-tick/route.ts`);

    await regenerateExecutables().catch(() => { /* the project is already written; a failed regen is not fatal */ });

    // CALENDAR DEMO SEED (Cron+Calendar step) — a couple of clearly-labeled example rows so the new
    // Calendar accordion is never an empty shell the moment the automation exists (same "ships a working
    // example immediately" principle already proven for History). No interactive creation flow exists yet
    // (the owner scoped this step to a STATIC preview) — this is the only source of rows for now.
    // Best-effort: a failed seed must never fail automation creation itself.
    try {
      const automationKey = `${category}/${project}`;
      const now = new Date();
      const in2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      const tomorrow9am = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      tomorrow9am.setHours(9, 0, 0, 0);
      const d = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      const t = (dt: Date) => `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
      await addRow(automationKey, "calendar", {
        date: d(in2Days), time: t(now), title: "Demo: look at Apple stock", type: "event",
      });
      await addRow(automationKey, "calendar", {
        date: d(tomorrow9am), time: "09:00", title: "Demo: prepare to check Tesla stock", type: "reminder",
      });
    } catch { /* the automation is already created; a failed demo seed is not fatal */ }
  }

  return {
    ok: true,
    version: VERSION,
    category, project, title, description,
    url: `/projects/${category}/${project}`,
    files,
    next: isStream
      ? "Rebuild projects-app (Deploy): the page renders header + footer + title + description, a working \"Ask\" console above the diagram, and a live History table below it — all wired to three REAL nodes (parse-request → lookup-price → record-result). Read app/(projects)/README.md \"The activation (launch console) standard\" and \"The dashboard tables & columns standard\", then adapt the three nodes for the owner's actual task."
      : "Rebuild projects-app (Deploy): the page renders header + footer + title + description + a dashed how-to card, and the top-right menu opens Settings (AI model + input channels) and Tests — both driven by the empty _data/channels.ts and _data/tests.ts declarations. Grow the automation by filling those declarations and adding the next node.",
  };
}

// No CLI shim here on purpose: this folder's path contains "(projects)" (a Next.js route
// group), which breaks plain `node`/`tsx` module resolution when the file is invoked
// directly (proven live) — a fragile "works on my machine" entry point is worse than none.
// The ONE real entry point is POST /api/projects/create (see that route's header comment),
// which every caller uses identically: the owner's terminal (curl) today, an AI agent via
// HTTP later. Same function, same path, always.
