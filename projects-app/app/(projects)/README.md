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
| **Diagram** | always on | yes | The diagram that implements the project's automation. | The real node graph; a node highlights as it runs. |
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

### User cases — numbered, status-badged, mandatory

User cases are the **mandatory** accordion (outside the six config entities), the result of the
architect dialogue at the earliest stage. Each case carries a **big number** (`01`, `02`, …) so the
owner can refer to it ("in case 02, change …"), the case title, and a **colored status badge**. The
lifecycle, English labels: **new → in approval → approved → in development → testing → in use**. A
fresh skeleton is **seeded with one case** — *"Architect planned the automation" / new* — so the step
is impossible to skip; it shows the agent the shape to reuse and forces it to segment the request into
cases. Types live in `_shared/use-cases.ts` (`UseCaseStatus`, `STATUS_META`, `UseCase`); the cases
themselves in the project's `_data/use-cases.ts`.

### The development cycle (why this shape)

An automation is **not built in one shot**. The user's initial request is broken into **raw user
cases** — even if the user never wrote it as cases. Cases are filed as *new* (or matched to existing
structure and given other statuses), and development runs in **many short iterations**, moving each
case's status forward until they are all **in use**. This is why the entities are declared first as
empty, tooltip-labelled containers: the shape is agreed before any interface is generated.

Like the standards above, the frozen starter emits `_data/config.ts` + `_data/use-cases.ts` and mounts
`AutomationAccordions` in the project's `index.tsx`, and mirrors a short copy of this section into the
project's own `README.md`. Refine the rules here first; the code follows.

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
- **Enforcement:** a machine validation that catches behaviour defined outside the diagram is the job
  of the implementation sub-step (223.C). This section **fixes the rule**; the later step **enforces it
  in code**. Until then the rule stands as a hard instruction on every agent.

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
