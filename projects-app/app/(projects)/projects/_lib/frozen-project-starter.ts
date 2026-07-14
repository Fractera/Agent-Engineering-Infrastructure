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
const VERSION = 8;
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
  "_data/activation.ts": `import { EMPTY_ACTIVATION, type ActivationSchema } from "../../../_shared/activation";

// THIS AUTOMATION'S ACTIVATION (frozen standard v8, step 241 E3) — what ONE RUN of it takes.
//
// EMPTY BY DESIGN, like _data/channels.ts and _data/tests.ts: the product cannot know, and must never
// presume, what a given automation's run needs. An INSTANCED automation runs as a FORK, and its parameters
// are CUSTOM to it — the coding agent determines them while designing this automation's architecture (from
// the owner's brief in the Fork activation panel) and declares them HERE. The launch control panel then
// renders itself from this file: a working control panel is written as DATA, never as UI.
//
// The shape (see _shared/activation.ts):
//
//   export const ACTIVATION: ActivationSchema = {
//     title: "Publish an article",
//     description: "One run researches a topic, drafts an article and publishes it.",
//     params: [
//       { key: "topic", label: "Topic", type: "text", required: true, help: "The keyword this run is about." },
//       { key: "publishAt", label: "Publish at", type: "datetime", help: "Empty = publish immediately." },
//     ],
//   };
//
// A param's \`key\` is the name the executor puts into the run's context, and the nodes pull their arguments
// out of it BY NAME (their \`paramsIn\`) — that is the whole wiring. NOTHING about schedules or limits is
// built in: an automation that needs a publish time simply declares a \`datetime\` param.
export const ACTIVATION: ActivationSchema = EMPTY_ACTIVATION;
`,
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
// DEFAULT (step 224): every fresh automation starts with THREE generic nodes — Input → Logic → Output — as
// DRAFTS (empty functions + a spec.md brief), because before a real task exists there is nothing built yet.
// So a fresh project is born "In development" until you build its nodes in the Builder (pull a node, write
// its brief, Start development). This file is REGENERATED by the Builder as nodes are added/removed.
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
  "_data/config.ts": `// This automation's CONFIG (frozen standard v4, step 222; toggles reversed in 237 — see
// app/(projects)/README.md, "The automation entities standard"). \`entities\` is the SEED for the
// hamburger menu's visibility switches (Diagram/Calendar/Map/Dashboard/Processes/Analytics/User cases) —
// the owner's live overrides win at runtime, no rebuild involved (see use-entities-live.ts). Nothing is
// structurally mandatory any more: \`diagram\` defaults on (useful while building), everything else
// defaults off until the automation actually needs it. The User cases review gate (step 231) stays
// mandatory before any Development Step regardless of this switch — this only toggles its accordion.
export const PROJECT_CONFIG = {
  entities: {
    diagram: true,
    dashboard: false,
    calendar: false,
    map: false,
    processes: false,
    analytics: false,
    usecases: false,
  },
} as const;
`,
  "_data/dashboard.ts": `import type { DashboardConfig } from "../../../_shared/table-config";

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
import { ActivationQuiz } from "../../../_shared/components/activation-quiz.client";
import { AutomationAccordions } from "../../../_shared/components/automation-accordions.client";
import { DiagramSection } from "../../../_shared/components/diagram-section.client";
import { GroupDetailSection } from "../../../_shared/components/group-detail-section.client";
import { SkeletonIntro } from "../../../_shared/components/skeleton-intro.client";
import { PROJECT_CONFIG } from "../_data/config";
import { USE_CASES } from "../_data/use-cases";
import { PROJECT_DASHBOARD } from "../_data/dashboard";
import { DIAGRAM_NODES } from "../_data/diagram";

// Frozen automation skeleton — VERSION 4. Header/footer come from the Projects-zone layout (step 213).
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
    // THE PAGE-LEVEL CHROME IS NOT HERE (step 241 E3.1). The development-wave banner, the page lock and the
    // launch control panel are mounted ONCE in the projects-zone layout, because THIS file only writes the
    // pages of projects created from now on — mounting chrome here left every already-existing automation
    // without it (the owner hit exactly that). The layout wraps every automation page, old and new.
    <>
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
        {/* Shown on the FIRST visit only (owner) — SkeletonIntro remembers per browser. */}
        <SkeletonIntro automation="{{CATEGORY}}/{{PROJECT}}">
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
        </SkeletonIntro>
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
    // Phase 1 of an automation's birth (step 224 §1.5): the immutable type + the owner's instruction.
    "{{AUTOMATION_TYPE}}": type,
    "{{AUTOMATION_INSTRUCTION}}": instruction,
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
