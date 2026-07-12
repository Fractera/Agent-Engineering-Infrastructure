# Projects zone — how to add a new CATEGORY

Read this file before creating a category. It is the single, authoritative walkthrough — do not
improvise a different shape. (For creating a **project** inside an existing category, see the
category's own `README.md`, e.g. `projects/other/README.md` — that is a different operation and
uses the frozen automation starter, not this file.)

## What a "category" is

The Projects layer (§3.12) has a fixed set of top-level folders under `app/(projects)/projects/`.
Each one is a **category hub page** (`/projects/<category>`) that lists the projects inside it.
Categories are **permanent and always visible**, even with zero projects inside — `other` proves
this: it exists purely as the catch-all and today holds no projects, only its own hub files.

Header and footer are **never part of a category's files** — both come from the zone layout
(`app/(projects)/layout.tsx`, steps 186.1/213) automatically. A category folder never renders its
own chrome.

## When to reach for this file

**Worked example.** The owner says: *"create me a new category for automations, call it 'training'
— I don't want to keep dumping training projects into `other`."* This is a request for a **new
category**, not a new project. Do the following, in order.

## Step 1 — pick the slug

Kebab-case, English, one word if possible (e.g. `training`). This slug is permanent — categories
are never renamed (mirrors the project-slug rule, §3.12).

## Step 2 — add ONE entry to the single source of truth

Categories are **data**, not scattered code. Everything that lists categories — the hub nav, the
`/projects` index, the account-drawer manifest, the frozen-project-starter's category validator —
reads the same array. Edit exactly one file:

`app/(projects)/projects/_shared/categories.ts`

1. Add the new slug to the `ProjectCategorySlug` union.
2. Add one object to the `PROJECT_CATEGORIES` array. **Insert it BEFORE the `other` entry** —
   `other` must always render last (it is the catch-all; every other category is a deliberate,
   named home). Order in the array = render order everywhere.

```ts
export type ProjectCategorySlug =
  | "automation"
  | "fractera-pages"
  | "personal"
  | "training"   // ← new slug added to the union
  | "other";

export const PROJECT_CATEGORIES: ProjectCategory[] = [
  { slug: "automation", title: "Automation", navLabel: "Business", description: "…" },
  { slug: "personal", title: "Personal effectiveness", navLabel: "Personal", description: "…" },
  { slug: "fractera-pages", title: "Fractera pages", navLabel: "Fractera pages", description: "…" },
  {
    slug: "training",
    title: "Training",
    navLabel: "Training",
    description: "One line explaining what kind of project belongs here.",
  },                 // ← new entry, inserted BEFORE "other"
  { slug: "other", title: "Other", navLabel: "Other", description: "…" },
];
```

Nothing else needs editing — `category-hub.server.tsx`, `projects-index.server.tsx`,
`projects-manifest.ts` and `frozen-project-starter.ts`'s category validator all iterate this same
array, so the new category appears in the nav and the `/projects` index the moment this file
changes and the app rebuilds. (This single-array design exists on purpose: a second, hand-kept
list of category slugs is exactly the kind of two-sources-of-truth drift that broke
`telegram-notes-clone` in steps 210-212 — never duplicate this list anywhere.)

## Step 3 — create the category's own 4 files

Create `app/(projects)/projects/<slug>/` with **exactly these files**, copied from `other/` (today's
empty reference category) and substituting the slug/title. Do not invent extra files — a category
hub is deliberately this thin.

### `page.tsx`
```tsx
import TrainingCategoryEntry from "./_components";

// Thin server entry — see app/CRUD-DOCS/workspace-standards/shell-component-architecture.md.
export default function Page() {
  return <TrainingCategoryEntry />;
}
```

### `_components/index.tsx`
```tsx
import { CategoryHub } from "../../_shared/category-hub.server";

export default function TrainingCategoryEntry() {
  return <CategoryHub slug="training" />;
}
```

### `_meta.ts`
Copy `other/_meta.ts` verbatim and substitute exactly four values: `path`, `filePath`,
`description`, and the `training` occurrences in `relatedRoutes`/`notes` — every other field
(`visibility`, `roles`, `rendering`, `seo`, …) stays byte-identical, it is the standard category
descriptor.

### `README.md`
Copy `other/README.md` verbatim, substituting only the category name in the first line. This is
what makes a project created inside the new category start correctly (see that file for why).

## Step 4 — build and verify

Rebuild `projects-app` and reload `fractera-projects` (or call the deploy route with
`target=projects`). Then confirm:
- `/projects/<slug>` returns 200 and shows the standard header + footer + the (empty) category hub.
- The new category's nav button appears on every hub page, positioned right before `Other`.
- `/projects` (the root index) lists the new category with its live project count (0).

## Category vs. project — do not confuse the two operations

| | Category | Project |
|---|---|---|
| What | A permanent top-level folder (`/projects/<category>`) | A named folder inside a category (`/projects/<category>/<slug>`) |
| How many | A handful, added rarely, by hand (this file) | Many, created constantly |
| How to create | Follow this file | **Never hand-write files.** Call the frozen automation starter — see the category's own `README.md` (e.g. `projects/other/README.md`) or `POST /api/projects/create` |

## The project CARD standard (one format, every project, no exceptions)

Every project shows up on its category hub as a **card** — the "button" a visitor clicks to open
it. That card is not hand-styled per project: `_shared/project-card.ts` reads it from ONE thing —
a hidden HTML comment in the project's `README.md`:

```
<!-- fractera:project
{"kind":"project","category":"<cat>","slug":"<slug>","title":"<Title>",
 "project":{"title":"<Title>","purpose":"<one sentence — becomes the card's description line>"},
 "interface":{"inputs":[...],"outputs":[...]},
 "nodes":[{"tools":["..."]}, ...]}
-->
```

No block → the card falls back to a bare, blank-looking title with no description and no badges
(`project-card.ts`'s `fallback`) — **this is the exact bug this session found**: a project created
without this block renders an "empty button." There is only ONE correct fix — emit a valid block —
never style around a missing one.

- `title` / `project.purpose` → the card's title line and description line.
- `interface.inputs[].type` + `interface.outputs[].type` + `nodes[].tools[]` → the badge row
  (de-duplicated, capped, "+N" overflow). An empty array here is fine and expected — it just means
  no badges show; it is NOT the same as a missing block.
- This is the **same block**, same shape, whether it is:
  - **hand-authored minimal** (the frozen starter's v1 skeleton writes an honest one — see
    `_lib/frozen-project-starter.ts`'s `README.md` entry — `purpose: "Not yet decomposed…"`,
    empty `interface`/`nodes`), or
  - **engine-generated rich** (`orchestrate-project-by-steps` writes the full graph — actions,
    state, every node with its real tools/io — once the project is properly decomposed; see
    `projects/personal/telegram-notes/README.md` for the reference).

  One format, growing richer over the project's life — never a second, competing format. If you
  ever touch a project's README, keep this block valid; if you add fields the engine emits that
  `project-card.ts` doesn't yet read, extend the reader, don't invent a parallel block.

## The settings & tests declaration standard

> This section is the frozen instruction for how a project declares its **Settings** and its
> **Tests**. It is written down here first, as-is, before the code follows it — treat the README as
> the spec. Both surfaces are **declaration-driven**: nothing about a specific channel or a specific
> test is hand-coded inside a component. A project declares *what* it has in `_data/`; the frozen
> shared components render and run it. This is what makes the pattern scale — a new automation gets
> Settings and Tests for free by writing data, not UI.

**Where declarations live.** In the project's `_data/` — never in `_meta.ts`. `_meta.ts` is the
`RouteMeta` descriptor: a fixed, universal standard where *every route* (including `/dashboard`)
carries *every* key. Automation-specific fields would break that contract, so they never go there.

### 1. Input channels — `_data/channels.ts` (type from `_shared/channels.ts`)

A channel is how the automation is fed or connected: Telegram, OpenAI, Google Calendar. A
**connector is just an input channel** — there is no separate "connector" concept; connecting one is
recorded here like any other channel. The Settings modal renders the channel list straight from
`INPUT_CHANNELS`.

```ts
export type ChannelKey = {
  env: string;        // the runtime env key, e.g. "TELEGRAM_BOT_TOKEN"
  label: string;      // WHAT it is, in plain words: "Bot token"
  help?: string;      // WHERE to get it: "Message @BotFather → /newbot → copy the token"
  optional?: boolean; // an empty value is a legitimate default, not a missing key
  secret?: boolean;   // masked input; the value is never echoed back
};

export type InputChannel = {
  name: string;         // the channel as a human names it: "Telegram", "Google Calendar"
  description: string;  // one line: what this automation receives (or publishes) through it
  keys: ChannelKey[];   // every key needed to connect it; several is normal (Google Calendar = 2)
};
```

`description` is the per-channel explanation; `help` is the per-field "where do I get this"
explanation. Both are declared once, in data — so the Settings UI can show a scalable, self-
explaining form without a single hard-coded hint. Required env keys are derived from the channels
(`requiredEnvKeys()` in `_shared/channels.ts`) — one source of truth, no parallel `required-keys`
list.

### 2. Tests — `_data/tests.ts` (type from `_shared/tests.ts`)

Every probe is declared **explicitly**, one per entity the automation touches, across three stages:
`input`, `intermediate`, `output`. Each probe carries its own **prepared** success / error text —
the test route only reports whether it passed; the component shows the declared text. There is **no
free-form / "custom" test** — that shape does not scale and is removed.

```ts
export type ProbeKind = "openai" | "telegram" | "lightrag" | "google-calendar"; // frozen shared kinds
export type ProbeStage = "input" | "intermediate" | "output";

export type ProbeBinding =
  | { type: "shared"; kind: ProbeKind }                    // → the frozen shared route /api/projects/tests/[kind]
  | { type: "project"; route: string; method?: "GET" | "POST"; body?: Record<string, unknown> };

export type Probe = {
  id: string;
  label: string;        // card title
  hint: string;         // card subtitle
  stage: ProbeStage;
  binding: ProbeBinding;
  successText: string;  // prepared, shown when the route reports ok
  errorText: string;    // prepared, shown when it fails
};
```

**Test route contract (both shared and project routes):** the endpoint answers
`{ ok: boolean; detail?: string }` (`detail` is for debugging only; the user-facing text comes from
the declaration). A `type: "project"` binding with `method: "GET"` may treat any HTTP 2xx as `ok`.

**Two layers of test routes.**
- **Typed / shared probes** (check the OpenAI key, reach the Telegram bot, ping vector memory, check
  a connector's OAuth) depend on the *channel type*, not the project. Their route lives **once** in
  the frozen layer and is reused by every project that declares a probe of that kind.
- **Project-specific probes** (e.g. "records for THIS project save to the database") live in the
  project's own API folder, but obey the exact same `{ ok, detail }` contract.

**The tests folder — naming gotcha.** A served route folder must **not** be called `_tests`: Next.js
treats `_`-prefixed folders as private and does not route them (and `_shared/projects-manifest.ts`
skips them). So the shared test routes live at `app/api/projects/tests/[kind]/` (served — one
dynamic route over all frozen kinds), while non-routed declaration registries live under `_shared/`.

### 3. Where these surface in the UI

The project menu (`automation-info-menu.client.tsx`) stays automation-agnostic by contract. After
the **Automation** section it gains: a separator → **Settings** (opens a 600×600 modal of accordions:
AI model, run interval, input channels) → a separator → **Tests** (opens a modal of probe cards).
The AI-model accordion needs the projects layer to serve its own self-sufficient
`/api/openai-models` (it does not today — the model picker silently degrades to a text box until it
exists); adding it is part of the implementation that follows this spec.

### Iterate here first

This standard is captured as-is so we can refine it *in the README* — add, remove, or change a rule —
before any component or route is built. Once it settles, the frozen shared components, the shared
`app/api/projects/tests/[kind]/` route, the `telegram-notes` reference, and the frozen starter (so
new projects are born with these modals and honest empty states) all follow from exactly what is
written above. When the starter emits it, this section is mirrored into the project's own `README.md`
the same way the CARD standard is.

## The automation entities (accordions) standard

> Below the "Add or modify automation" button, a project shows a **series of accordions — one per
> entity**. The entities are **config-driven**: `_data/config.ts` (`entities`) turns each on or off.
> At this stage an enabled entity renders an **empty container** whose title has a **hover tooltip**
> explaining what it is; a disabled one is not rendered. Later, the data inside each container will
> drive real interface generation. The registry in code is `_shared/entities.ts` (labels + tooltips);
> the per-project toggle is `_data/config.ts`. This table is the source from which the automation grows.

| Entity | Config | Mandatory | Purpose | Grows into |
|---|---|---|---|---|
| **Diagram** | always on | yes | The diagram that implements the project's automation. **Not an accordion** — it is ALWAYS visible, full screen width × 80vh, as the centerpiece (owner design). | The real node graph; a node highlights as it runs. |
| **Calendar** | optional | no | Time-based events (reminders, dated items). | A calendar UI; can integrate Google Calendar and other tools. |
| **Map** | optional | no | Tasks/events tied to a geographic location. | A map UI; can integrate maps and location services. |
| **Dashboard** | always on | yes | Data-visualization slices. | Sub-dashboards for different views of the data. |
| **Processes** | optional | no | A timeline (Gantt) of automations — start / duration / end. Pick a node to open its concrete diagram with the running node highlighted. | Common in content marketing, where each generation is a sequence stretched over time. |
| **Analytics** | optional | no | Performance summaries. | User-defined charts on shadcn/charts. |
| **User cases** | **always (outside the 6)** | **yes** | The cases agreed with the architect — what the automation should do, one case at a time. | The segmentation + approval workflow (see below). |

**Scaling — adding a new entity.** The set is not fixed forever. To add one: (1) add its key to
`EntityKey`, (2) add a row to `ENTITY_META` (label + tooltip, `mandatory` if always-on), (3) place it in
`ENTITY_ORDER`. Nothing else changes — the accordion component reads the per-project config as `Partial`,
so an entity absent from an existing project's `_data/config.ts` simply reads as *off* until that project
enables it. Mandatory entities (today **Diagram** and **Dashboard**) render regardless of the config.

## The dashboard tables & columns standard (step 228)

> The **Dashboard** is ONE tab that holds **ANY number of tables**. What each table draws is decided by
> **CONFIG**, never by the data — every automation's data differs, so the config describes the *format*, not
> the values. A **column is DATA, not JSX**: the shared universal table renders whatever the config declares
> through a **closed set of typed cells**. To add or change a column you edit the config; you never write a
> component. A fresh automation is born with **one demo table**; when the automation is designed
> (Quiz / decomposition, step 227), the model **adds the tables it needs to analyse its work**, by this same
> standard.

**Where it lives.** The config type is `_shared/table-config.ts` (`DashboardConfig` → `DashboardTable[]` →
`TableColumn[]`); the per-project config is `_data/dashboard.ts` (`PROJECT_DASHBOARD`). The universal table
is `_shared/components/config-records-table.client.tsx`; the closed renderer registry is
`config-record-cell.client.tsx`; the accordion is `dashboard-accordion.client.tsx`.

**A column's anatomy.** `{ id, header, type, source, defaultVisible, options? }` — `source` is the key it
reads from a row's `values`; `defaultVisible` decides whether it shows at startup (the user's personal
show/hide choice is remembered in **localStorage**, per table). Wide tables **scroll horizontally** — columns
are never squashed.

**The closed column types + when each is justified** (the machine-readable canon is
`_shared/column-kinds.ts`; keep the two in step):

| Type | Job | Draws | Needs (enough-data test) |
|---|---|---|---|
| `badge` | a short categorical state | a colored pill (`options.colorFrom`) | a short enumerable value + a color field |
| `text` | a short scalar | a truncated line | a short string |
| `longtext` | a long field | a clamped line, expands on click | a genuinely long string |
| `number` | a measure to compare/total | right-aligned, formatted, `options.suffix` | a numeric value |
| `date` | when something happened / is due | localized date; `options.emphasizeIfFuture` | a parseable date/timestamp |
| `link` | an outward reference | an "Open" link | a URL |
| `image` | a visual the row owns | a thumbnail | an image URL |
| `actions` | act on the row | a Details / delete button | the row id (`source: "id"`) |

**The rule of enough data.** A column is justified ONLY when a row can supply what its type *needs* (the
table above). If the data cannot provide it — no color for a badge, no URL for a link, no number for a
number — the model must drop the column or gather the data first, not emit an empty column. This is exactly
what `column-kinds.ts` encodes so a model can check a declaration before writing it.

**Growing a table = data, not code.** Add a column → add an entry to the table's `columns[]`. Add a table →
add an entry to `PROJECT_DASHBOARD.tables[]`. A genuinely NEW visualization (a new column type) is the only
thing that touches code: a new `ColumnType` + a renderer in the registry + a row in the table above — never
new JSX inside a project.

**The model's default tables (step 227 seam).** When an automation is designed, the model is expected to
populate `_data/dashboard.ts` with the tables the automation needs *to analyse its own work* — by this
standard, checked against `column-kinds.ts`.

**Live rows (step 229) — the config declares COLUMNS, the DB holds ROWS.** A table's rows are no longer only
the config's seed: they live in the DB (`dashboard_rows`, keyed by `automation` + `table_id`, all fields in
one `values_json` blob — never a column-per-field, since a live server cannot ALTER a table; lesson 225 G4).
Because the data is in the DB, not in a file, **rows appear with no rebuild**.
- **Read:** `GET /api/projects/dashboard/rows?automation=<cat/slug>&table=<id>&search=&offset=` →
  `{rows, hasMore, source}`. `source:"live"` = real rows; `source:"empty"` = the table shows the config's
  **seed** rows as a demo (a fresh dashboard is never blank). The first live row **replaces** the seed.
- **Write:** `POST /api/projects/dashboard/rows {automation, table, values}` — the automation's own nodes
  fill their table this way as they run (role `agent`); the owner does the same with **"Add row"** in the UI.
  `DELETE /api/projects/dashboard/rows/<id>` removes a live row (seed rows are read-only demo). `values` is a
  flat map of `column.source → value`; the columns decide what to pull out of it.

### User cases — numbered, status-badged, mandatory

User cases are the **mandatory** accordion (outside the six config entities). Each case carries a **big
number** (`01`, `02`, …) so the owner can refer to it ("in case 02, change …"), the case title, and a
**colored status badge**. The lifecycle, English labels: **new → in approval → approved → in development
→ testing → in use**. Types live in `_shared/use-cases.ts` (`UseCaseStatus`, `STATUS_META`, `UseCase`).

**Storage (step 231).** The DB is the SOURCE (`automation_use_cases`, `lib/use-cases.ts`); the project's
`_data/use-cases.ts` is the **regenerated artefact** — the same Model-B split the diagram uses. Never
hand-edit the file: it is rewritten on every add / edit / delete. A fresh skeleton emits it **empty**.

### 🔴 Use cases come FIRST — the gate (step 231)

**An automation is not created from an instruction.** Its first stage is the scenarios:

1. On the **first visit** the Quiz opens in the **use-case phase**. It tells the owner, in the project's
   language, to describe every scenario that can come up for him — or for the AI — while working with the
   automation: who triggers it, what comes in, what must come out, and what happens when something goes
   wrong. **Free speech, no format; voice dictation is recommended.**
2. The model interviews him, and replies `READY` when the description is **detailed enough**.
3. **"The cases are ready"** turns the conversation into numbered cases (status `new`) and only THEN does
   the Quiz move on to designing nodes.
4. **Skipping is refused, loudly.** `POST /api/projects/quiz/next-node` returns **409** while the session
   is still in the use-case phase, or while the automation has no cases: *"without a detailed description
   the automation cannot be created"*. Closing the dialog is allowed — it reopens on the next visit.

### The review gate — where the owner and the AI agree (step 231)

**No development step is ever created until the owner has read the cases back and confirmed them.** The
Use cases panel shows the state (confirmed / not confirmed) and a **"Read & confirm"** dialog listing every
case; confirming records a hash of exactly what he agreed to and moves `new` cases to `approved`.

The gate (`assertUseCasesReviewed`, `lib/use-cases.ts`) is enforced in **every** path that materializes a
step — the Quiz's "finish this node", and the Builder's "Start development" / rocket. **Editing, adding or
deleting a case changes the set and stales the confirmation**, so a changed scenario always forces a fresh
agreement before more code is written. Both refusals return `409` with the reason (`no-cases`,
`not-reviewed`) and the UI opens the review dialog from the toast.

### Editing the cases — pencil, pencil, trash

- **Pencil on the panel header** → the Quiz walks the **whole set** again: each case in turn, plus any new
  one the owner wants to add.
- **Pencil on a case** → the same Quiz, scoped to **that** case.
- **Trash on a case** → delete, always with a confirmation. Nodes that implement it are *not* deleted.
- Each session ends the way a node does: **ONE development step per changed (or added) case**, written to
  the existing file queue (`materializeUseCaseStep`, `DEVELOPMENT-STEPS/NEW-STEPS/`). The step does not
  name files — which nodes the case touches is what the coding agent works out from the diagram.

### The development cycle (why this shape)

An automation is **not built in one shot**. The owner's request is broken into **raw user cases** — even
when he never wrote it as cases — and development runs in **many short iterations**, moving each case's
status forward until they are all **in use**. This is why the entities are declared first as empty,
tooltip-labelled containers: the shape is agreed before any interface is generated.

Like the standards above, the frozen starter emits `_data/config.ts` + `_data/use-cases.ts` and mounts
`AutomationAccordions` in the project's `index.tsx`, and mirrors a short copy of this section into the
project's own `README.md`. Refine the rules here first; the code follows.

## The processes (Gantt) timeline standard (step 230)

> The **Processes** entity is a **Gantt timeline of an automation's FORKS**. It appears ONLY for automations
> that have forks (Instances, see the diagram standard below); a fork-less automation shows an honest empty
> state. It answers one question visually: *when does each fork, and each of its nodes, run?*

**One fork = one row.** Rows are sorted nearest-first (priority order). A fork is a bar whose **length is the
sum of its nodes' estimated process times**; inside the bar the **nodes are nested bars**, laid out
sequentially. A live **"now" line** marks the current time (moved every second on the client); hovering a
node or fork shows **when it activates**; the whole space **scrolls horizontally**. **Clicking a bar** scrolls
up to the **Instances panel** (`#instances-panel`) so you can open or edit that fork.

**Where the length comes from — the node's estimate.** Every node carries `estDurationMs` in its `meta.ts`
(step 230) — the model's rough guess of the node's process time, written when the node is designed
(Quiz/Builder). No precision is needed; it may be ms, seconds, minutes or days. It lives in the file (Model
B), never a column on `automation_nodes` (lesson 225 G4). A node with no estimate uses the default (60s).

**The schedule engine** (`lib/schedule.ts`, table `automation_schedule` — one row per fork). Forks are a
**priority queue**: each is planned to start when the previous one ends. Then reality refines the plan:
`automation_runs` gives each fork its **actual** start/end, and a run that finishes early or late **shifts**
the following forks. Recompute happens (a) on every read of `GET /api/projects/schedule`, (b) when a run
finishes (`runs/simulate` → recompute), and (c) once a minute from `fractera-cron` (POST
`/api/projects/schedule/tick`) so the timeline stays honest even when no one is watching.

**Editing a fork before it runs → deterministic recompute.** A fork that has not started can be changed in
the Instances panel (its per-node overrides — e.g. "about dogs, 2000 words" instead of "cats, 1000"). Because
each disabled function subtracts its **share** of a node's time (`ms / functionCount`), the fork's length is
**recomputed deterministically** from the node estimates — no model call — and the timeline rebuilds. (An
optional "AI re-estimate" button, which would call the model for a fresh estimate, is reserved for later.)

**Reference pattern.** This is classic Gantt/timeline scheduling (project timelines, resource charts) crossed
with a live **ETA queue** (CI pipelines, render farms): a plan drawn from estimates, continuously shifted by
actual completion. Common in content marketing, where each content generation is a sequence stretched over
time.

## The diagram standard (Master & Instance)

> This section is the specification for the **Diagram** entity — the accordion that defines HOW an
> automation works. It is written down first, as the raw accumulating spec (like the standards above);
> the tools that build and edit diagrams come in the next sub-steps (223.B/223.C). Read it before you
> ever reason about an automation's behaviour. **Do not port the Telegram Notes diagram** — that
> implementation is not the model here; reuse it only if the architect explicitly asks for something
> similar.

### 1. What the Diagram accordion is

The Diagram accordion is the **single place that defines how the automation works**. It shows **two
kinds** of diagram: the **Master diagram** (always) and, conditionally, an **Instance diagram**.

### 2. Master diagram (always present)

The Master diagram is the **sequence of nodes that IS the way the automation works** — it is the
automation's starting template. There is exactly **one** Master per automation, and it always exists.
Every node in it carries an **exhaustive description** of what that node does. The Master is the
definition: reading the Master is reading the automation.

**The frozen default — three nodes.** A fresh automation's canvas starts with **three generic nodes:
Input → Logic → Output**, because before a real task exists there is nothing to design yet — this is the
universal starting shape every automation shares. When the automation is designed from the user cases,
the **Logic** node splits into real, named nodes (each with its co-located functions). The three
defaults carry no functions until then. The frozen starter emits them in `_data/diagram.ts`.

### 3. Instance diagram (conditional)

An Instance diagram is **one concrete run** of a process that is **self-contained — it has a beginning,
a middle and an end**. Instances exist **only** for automations whose work is discrete, finite
processes. An Instance is created as a **fork of the Master into a sub-automation tree** (see §5).

### 4. Choosing the mode (the crisp rule for the agent)

Decide with **one test question**: *"Does a single request spawn one or more independent, finite
processes, each with a start → … → end?"*

- **No → Master only.** The automation is unconditionally active, single and reactive — one continuous
  behaviour with no start/end run. **Example: Telegram Notes** — the bot is always "on"; there is no
  discrete process to instantiate, so the Diagram accordion shows only the Master.
- **Yes → Master + Instance.** One request spawns independent finite runs, each executing to
  completion. **Example: content creation** — "make 3 posts (cats, dogs, hamsters), publish Mon/Wed/Fri".
  Each post is its own finite process — e.g. *find sources → build the semantic structure → SEO
  optimization → prepare the content → create the site page → publish* — so each run is an Instance.

### 5. Data model

- **Master** = nodes + each node's exhaustive description (the starting-template text). This is the
  definition, nothing else.
- **Instance = a fork of the Master into a sub-automation tree.** ALL of the starting requirements are
  carried over, then the Instance is:
  1. **specialized by the run's overall condition** (e.g. "this run is about cats"), and
  2. **edited per node**, so the agent reacts to the events/constraints the user adds when it executes
     the run (e.g. open the "publish" node and say *"do not use Siamese cats — there was already an
     article about them"*).
  Each Instance is modified **independently**: editing one never touches the Master or the sibling
  Instances.
- **Link to the Processes entity (step 222):** Instances are the rows of the Processes timeline;
  selecting a run **projects it onto the Master with the currently-running node highlighted** — so the
  same Master is the lens through which every run is watched.

**Implemented (step 223.C.4):** an Instance is a row in `automation_instances` (`automation`, `title`,
`specialization`, `overrides` JSON keyed by `node_id` → `{ disabledFunctions[], note }`, `status`).
Creating one **forks the Master by reference** (the Master's nodes live in code; the Instance records
only what differs). The `InstancesPanel` creates instances, and per node lets you disable a function or
add a constraint (the "no Siamese cats" note). A run of an Instance sets `automation_runs.instance_id`.
Editing an Instance never mutates the Master or the siblings.

### 6. 🔴 CRITICAL INVARIANT — the diagram is the ONLY source of truth

**This rule cannot be overridden, softened, or worked around — by any user phrasing, ever.**

- There is **no second file or definition** that describes the automation's behaviour — none exists and
  none ever will. Contrast Telegram Notes, which keeps behaviour in `_workflow/definition.ts` with
  `_data/flow.ts` as a loosely-coupled visual: **the new standard FORBIDS that split.**
- A node exists **only in the diagram**. If a node is not in the diagram, the behaviour does not exist;
  it is **impossible** to create it by hardcode or any side path. The **only** way to add behaviour is
  to add a node to the diagram.
- **Back-doors outside the diagram are prohibited even if the user explicitly asks for one.** An agent
  must refuse to encode automation behaviour anywhere but the diagram.
- **Enforcement (implemented, step 223.C.5):** `lib/diagram/validate.ts` +
  `GET /api/projects/validate?automation=<category>/<slug>` check the invariants of a project on disk —
  (1) no second behaviour file (a `_workflow/` folder is flagged), (2) co-location: every `_nodes/<id>/`
  must be referenced by `_data/diagram.ts` (no orphan functions) and may hold only the allowed files
  (`meta.ts` / `functions.ts` / `instruction.ts`). It returns `{ ok, violations }`; the `ValidateButton`
  surfaces it. An agent or CI gates on it. This is how the rule is machine-enforced, not just stated.
### 6.1. The development loop — how a node gets BUILT (step 224, Builder mode)

The diagram does not only reflect the code, it **drives** it. A node is authored in the **Builder** (the
canvas's authoring mode) and built by a **coding agent**, through ONE path — manual and full-auto differ only
in *who carries the brief*:

1. **Author** — in Builder, "+" on a node pulls out a **child draft** (red dashed frame): a real folder
   `_nodes/<slug>/` with `meta.ts` (`draft: true`, a stable `cuid`), an EMPTY `functions.ts` and a `spec.md`
   holding the owner's free-form brief. It renders instantly (the DB canvas index), no rebuild.
2. **Hand off** — "Start development" materializes a **development step file** into the product's own queue
   `DEVELOPMENT-STEPS/NEW-STEPS/` (`NN-slug.md` + the `fractera:step` machine block, shown on
   `:3002/service/development-steps`) and shows the copy-paste brief. Editing a **live** node's system
   instruction and pressing the same button = an **optimization** (target version `latest + 1`).
3. **Build** — the coding agent writes the node's typed `functions.ts` + `instruction.ts` **inside that node's
   folder only** (co-location), then makes the MANDATORY closing call
   `POST /api/projects/nodes/<cuid>/materialize {summary, devStepRef}`. That drops the draft flag, records a
   FULL version snapshot, sets `active_version = latest_version = N`, regenerates `_data/diagram.ts`,
   rebuilds — and moves the step file to `COMPLETED-STEPS/`.
4. **Full-auto (step 224 L7)** — the agent skips the human carrier: `GET /api/projects/dev-steps` returns the
   pending queue with the full brief; it builds, materializes, repeats. Same endpoints, same files.
5. **Roll back** — `GET .../versions` lists a node's history; `POST .../rollback {version}` restores that
   version's files and sets `active_version` (the history and `latest_version` stay intact).

**Interlock:** while ANY node is still a draft, the automation is **auto-stopped** — its pill reads
**"In development" (indigo)** and it cannot be activated. Running **Instances** (forks, §Master/Instance) keep
working off their own snapshot; the interlock is about the Master.

### 6.2. The GLOBAL architecture — how automations are wired to each other (step 225)

An automation is not an island. The workspace itself is a graph: on `/projects`, below the cards, the
**global canvas** shows **every project as a node** and every **link** as a *programmable integration between
two automations*. Unlike the tree inside one automation, this graph is **arbitrary** — a link may join **any**
node of X to **any** node of Y (not only parents/children, not only leaves).

**A link is a first-class entity with the same lifecycle as a node.** Its code lives in its own folder
`projects/_edges/<cuid>/` (`meta.ts` + `spec.md` + `functions.ts`) and belongs to **no** project — it is
*between* them; deleting a project prunes its links, so nothing dangles.

**🔴 THE READINESS GATE.** A link can be created ONLY between automations whose development is **finished**
(no draft nodes on either side) — creating a link always changes its endpoint nodes, so they must be built
first. A refused attempt answers `409` with a machine-readable reason (`gate: {from, to}` with the count of
nodes still to build). **An agent must read that refusal, build the missing nodes, and retry** — it is a
contract, not an error to swallow.

**THE AGENT LOOP for links** (an AI can wire the whole workspace with no human in the middle):

1. `GET /api/projects/global` — the whole graph: every project, its readiness (`ready`, `drafts`), every
   link, the global status.
2. `GET /api/projects/nodes?automation=<cat/slug>&withPorts=1` — the **typed ports** of each node (`in`/`out`),
   so the endpoints are chosen by CONTRACT (which output can feed which input), not by guessing.
3. `POST /api/projects/edges` `{from, to}` — create the link (or read the gate's refusal and go build nodes).
4. `PATCH /api/projects/edges/<cuid>` `{fromNodeCuid, toNodeCuid, spec}` — choose the endpoint nodes and write
   the **brief**: which output feeds which input, under what conditions, how they stay in sync.
5. `POST /api/projects/edges/<cuid>/start-development` — queue ONE development step (the product's own
   `DEVELOPMENT-STEPS/NEW-STEPS/`; it shows up in `GET /api/projects/dev-steps` like any node step).
6. Write the integration in `_edges/<cuid>/functions.ts`, then the MANDATORY close:
   `POST /api/projects/edges/<cuid>/materialize` `{summary, devStepRef}` → the link gains a version, the step
   moves to `COMPLETED-STEPS/`.
7. `GET /api/projects/edges/validate` → `ok: true`.

The **Quiz** does step 4 for you: opened on a link (`POST /api/projects/quiz {edge: "<cuid>"}`) it brainstorms
the integration — it sees both automations and all their nodes — and `POST /api/projects/quiz/edge-apply`
writes the link's `spec.md` and queues its development step.

**Global status:** any draft link ⇒ *in development*; the owner may turn the global automation **off** — then
the projects keep running exactly as before, only the **synchronisation between them** stops.

- **Evolution (step 224, Builder mode) — a node has a lifecycle, and a DRAFT is a legal file stub.** A node
  created in Builder is born a **draft**: its `meta.ts` carries `draft: true`, its `functions.ts` is empty,
  and it holds a `spec.md` (the owner's free-form brief). It is on the canvas (a real folder, referenced by
  `_data/diagram.ts`) but **ignored by execution** — a project with any draft node auto-stops (status *In
  development*) and cannot be activated until every node is materialized. So `spec.md` is now an allowed node
  file, and the validator enforces the two states: `draft:true` ⇒ empty `functions.ts` + a `spec.md`;
  materialized (no draft flag) ⇒ non-empty `functions.ts` + no `spec.md`. Node identity is a **CUID**
  (`meta.ts` `cuid`), stable across a folder rename so per-node version history never breaks. This is the
  documented softening of "single source of truth": the diagram (files) still owns topology; the DB only adds
  a live canvas index + version history — it never becomes a second source of behaviour.

### 7. Scope of this sub-step

This sub-step is **description only** — this README plus the agent's own instructions. No diagram
build/edit tools exist yet (that is 223.B/223.C). The section accumulates in the raw spec; the code
follows once the wording settles.

When the starter emits it, a short copy of this section (with the §6 invariant) is mirrored into the
project's own `README.md`, so every project carries the rule.

## The node → functions contract

> A node is not an abstract box — it is a **typed container of the application's own functions**. This
> section is the spec for what lives BEHIND a node: what it stores, how it is designed from use cases,
> how it lights up while running, and where the runtime state ("which node is working right now") comes
> from. It is still **description only** — the tools that generate `_nodes/`, the run tables, and the
> co-location validator are the next sub-step (223.C). It continues the raw accumulating diagram spec.
>
> Reference (an ANTI-pattern, do not copy): the current Telegram Notes node panel
> (`_components/process-flow.client.tsx` — click a node → an aside with summary/actions/condition/task/
> tools/io) over `_data/flow.ts` (`FlowNodeInfo`). The new node looks fundamentally different: name +
> description + accordions, and its data works as functions, not as free text.

### 1. Node anatomy (what it stores; how the right-hand panel shows it)

A node stores: **`name`**, **`description`**, **typed input parameters**, **typed output parameters**,
and **conditions / control rules**. When a node is selected, these appear as separate, highlighted
sections in the right-hand panel. `name` and `description` show directly; everything else sits in
**pre-closed accordions** you can open:

- **The "Instruction" accordion (first):** the system instruction the AI agent uses to create the
  node's functions and types — written in whatever form the agent finds useful for that job.
- **One accordion (card) per function:** the function's name and the parameters it accepts and returns
  (typed). This is less for a human and more so the **AI agent** knows exactly what is called and how.

### 2. Designing a node (from use cases)

The need for an intermediate node arises → the node gets its **`name` + `description`** → a **system
instruction** is generated → from it a set of **typed functions** + **control rules** is formed → the
node is now **designed** and ready to run **sequentially or in parallel** with the others. When it is
done, the user can open it to read the step description and, if ever needed, the functions it contains
(they rarely will).

### 3. The function & node contract (types as SPECIFICATION, not runtime code)

The shape (illustrative TS in the doc — not a file):

```ts
// A single function of a node — deterministic application work.
type NodeFunction = {
  name: string;
  paramsIn: Record<string, TypeSpec>;   // typed inputs
  returns: TypeSpec;                     // typed output
  rules?: string[];                      // control rules the agent must honour
};

// A node = an ordered/parallel set of functions + the node's own typed I/O and conditions.
type NodeContract = {
  id: string;
  name: string;
  description: string;
  in: Record<string, TypeSpec>;
  out: Record<string, TypeSpec>;
  conditions?: string[];
  functions: NodeFunction[];
  run: "sequential" | "parallel";
};
```

This is the specification 223.C will materialize into `_nodes/<id>/` (see §5).

### 4. No AI "inside the application"

A node's functions are **deterministic application code**. Running the AI *inside the application* is
**forbidden**. The AI is allowed ONLY as an **explicit external tool-call step** within a node, when the
work genuinely cannot be done without it (e.g. asking an agent to generate an image or a piece of text).
Distinguish clearly: *"the application executes functions"* vs *"a node calls an external AI tool as one
of its steps"* — the latter is a declared external call, not the app thinking for itself.

**Every external-AI function MUST carry, and the panel MUST display in FULL, the system instruction it
passes** (`NodeFunction.externalAi.systemInstruction`). This is not the node's build instruction
(§1 — how the functions were generated); it is the actual runtime system prompt sent to the external AI.
Showing it in full (never truncated) makes it clear WHAT is invoked and, together with
`externalAi.resultMapping`, HOW the AI's answer binds back to the function's typed return — so the formed
request and its result are always traceable. A function without `externalAi` is plain deterministic code
with no AI. The panel marks external-AI functions with an "external AI call" badge.

### 5. 🔴 Co-location of a node's functions (critical invariant — continues §6 of the diagram standard)

A node's functions live **only** in `projects/<category>/<slug>/_nodes/<nodeId>/`:

```
projects/<category>/<slug>/
  _nodes/
    find-sources/
      meta.ts          // name, description, typed in/out, conditions, run mode
      instruction.md   // the system instruction that generated the functions
      functions.ts     // the typed function set
    build-structure/
      ...
```

**No shared/common directory. Ever.** Delete the automation → every one of its functions vanishes
**without a trace and with zero technical debt.** Lifting a node's functions into a shared `lib/`
is prohibited. The machine validation of this rule is 223.C.

### 6. Active-node highlighting (best practice — designed here)

A node that is executing gets a **bold orange frame**. The mechanism is **DB-backed, not an ephemeral
client flag**: execution writes the `current_node` of the active run (§7); the diagram reads the
automation's active run(s) and frames the node whose `automation_run_nodes.status = 'running'`. So the
highlight is deterministic and survives a page reload. (Contrast: `selected` in
`process-flow.client.tsx` today is a pure client selection, unrelated to execution state.)

### 7. Runtime state — the unified run model (the core of this step)

The model that answers *"which node is working right now, and how much is done"*:

```
automation_runs       id · automation · instance_id? · current_node · status · started_at · finished_at · payload
automation_run_nodes  run_id · node_id · status(idle|running|ok|fail) · payload
```

- *"3 posts prepared, work is now on the 3rd node of the dog-article automation"* = query the active
  `automation_runs` (by automation, `status = 'running'`) plus their `current_node` /
  `automation_run_nodes`.
- It is read through the automation's own API (step 224, item 3 "state of each running process").

### 8. Reuse across BOTH scenarios (the technical payoff, stated plainly)

ONE node/function contract + ONE run model serve both:

- **Simple (Telegram, Master-only):** the run is transient (`instance_id = null`), the highlight is
  momentary, there are no Instance rows.
- **Complex (content, Master + Instance):** each Instance is a durable run whose `current_node` is a row
  of the **Processes** timeline; selecting it projects onto the Master with the orange frame.

Simple = "a Master run with no Instance"; complex = "Master + Instance runs". Same tables, same
highlight, same node contract — maximum reuse.

### 9. Example — the expected "function output"

A content node, `publish` (the last step of an article process):

```ts
// _nodes/publish/meta.ts
export const NODE: NodeContract = {
  id: "publish",
  name: "Publish the article",
  description: "Creates the site page and publishes the finished article on its scheduled date.",
  in:  { article: "Article", slug: "string", publishAt: "ISODate" },
  out: { url: "string", publishedAt: "ISODate" },
  conditions: ["publishAt is in the future", "the article passed the SEO node"],
  run: "sequential",
  functions: [/* see functions.ts */],
};
```

```md
<!-- _nodes/publish/instruction.md (the system instruction that generated the functions) -->
Build the functions that turn a finished Article into a live, scheduled site page. Do the mechanical
work in application code; call an external AI tool ONLY if a step truly needs generation. Each function
must be typed (inputs and return) and side-effect-scoped to this node.
```

```ts
// _nodes/publish/functions.ts
export function createSitePage(article: Article, slug: string): { pageId: string } { /* app code */ }
export function schedulePublication(pageId: string, publishAt: ISODate): { jobId: string } { /* app code */ }
export function publishNow(pageId: string): { url: string; publishedAt: ISODate } { /* app code */ }
```

**Per-instance override.** In an Instance (§ diagram standard), a node may disable or replace a function
for that run only — e.g. open the `publish` node of the "cats" Instance and add the rule *"do not use
Siamese cats — there was already an article about them"*, or turn a function off for this run. The
Master and the sibling Instances are untouched.

### 10. Scope of this sub-step

Description only. The tools, the `_nodes/` generation, the `automation_runs` / `automation_run_nodes`
tables, and the co-location validator are 223.C. The section accumulates in the raw spec.
