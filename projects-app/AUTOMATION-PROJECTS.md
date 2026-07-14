# AUTOMATION-PROJECTS.md — how Fractera automations are built, run and evolved

> The single authoritative document a coding agent reads before touching any automation under
> `app/(projects)/projects/<category>/<slug>/`. It is the **address book + doctrine**, not a duplicate of
> the deep per-standard specs — those live in `app/(projects)/README.md` and are referenced by section
> name below, not re-explained. Every Development Step brief that hands you an automation tells you to
> read this file first (see `lib/dev-steps.ts`). Statements below are marked **proven** (verified live,
> this session, by direct route/DB inspection) or **planned** (the owner's stated intent, not yet built or
> not yet wired) — never assert a "planned" item as working.

## 1. The two-phase doctrine (why any of this exists)

A Fractera automation is built in **two phases with two different costs**:

1. **Design (expensive, once).** A coding agent, using a strong model, designs the automation's node/edge
   event-chain — inside the very workspace where the automation will subsequently run.
2. **Run (cheap, forever).** A weak model, a plain deterministic function, or a bare API call **executes**
   that chain autonomously afterwards, at minimal-to-zero AI token cost per run.

An automation is therefore an **autonomous, controllable, self-linked (single-level or recursive) chain of
events** for a marketing/sales/business process — optimized for its own **runtime** efficiency, not for how
convenient it was to design. Every convention below exists to keep phase 2 cheap: deterministic node code,
typed contracts a weak model can iterate without special-casing, and a diagram that is the one and only
place behaviour can live.

## 2. The three automation types (proven — `_shared/automation-type.ts`)

Chosen once at creation, in the creation modal; **immutable afterwards** — to change it, delete the
automation and create a new one. Stored in `_data/automation.ts` (`AUTOMATION_TYPE`), shown as a coloured
badge in the page's top bar.

| Type | Meaning | Example |
|---|---|---|
| `stream` | No forks. Every incoming event runs the identical scheme end to end. | telegram-notes (historical — see §7) |
| `instanced` | Each activation forks Master → Instance, with its own parameters; may be deferred, tracked, edited per-fork independently of the Master and its siblings. | "3 posts, publish Mon/Wed/Fri" — each post its own finite Instance |
| `chained` | A link in a chain of two or more *other* automations (of either type above), in any sequence; renders as a canvas-only **group** container, never gets its own workflow. | outreach automation → hands off to a dialog-script automation |

All three start from the identical frozen skeleton (three draft nodes: Input → Logic → Output) — only the
stored type token and how the global canvas renders the project differ.

## 3. Creating an automation (proven end to end)

One function, one entry point, `createFrozenProject` (`app/(projects)/projects/_lib/frozen-project-starter.ts`),
called by `POST /api/projects/create` — the owner's terminal today, an AI agent via the same HTTP call later,
never a second code path. Pure template + token substitution, zero code generation. It materializes:

- `_data/description.ts` (title + description), `_data/automation.ts` (the immutable type),
  `_data/instruction.md` (the owner's mandatory free-form top-level instruction — the seed for the Quiz),
  `_data/channels.ts` + `_data/tests.ts` (empty declarations — a channel/probe is declared only once actually
  used), `_data/config.ts` (which entity accordions are visible), `_data/use-cases.ts` (empty — cases are
  the automation's *first* stage, not a placeholder), `_data/diagram.ts` + three draft `_nodes/{input,logic,
  output}/` folders (empty `functions.ts`, a `spec.md` brief, `draft: true`), and a `README.md` carrying the
  `fractera:project` machine block.
- **What runs next, in order (proven):**
  1. First visit → the **Activation Quiz** opens and refuses to design a single node until the owner has
     described his use cases in free speech (voice encouraged) — this is the mandatory *first stage*, not an
     optional brainstorm (step 231). Cases are stored as a live entity (DB-backed; `_data/use-cases.ts` is a
     generated projection of the store, never hand-edited) and walk a status ladder `new → in-approval →
     approved → in-development → testing → in-use`.
  2. **The review gate.** No Development Step can be created until the owner has read the cases back and
     confirmed the AI understood correctly — `assertUseCasesReviewed()` (`lib/use-cases.ts`), enforced inside
     `POST /api/projects/start-development` (409 with a reason if not yet confirmed). Editing the case set
     resets this confirmation.
  3. Once reviewed, the owner (or an agent) calls `POST /api/projects/start-development {automation}` — the
     top-level "Start development" handoff (step 233). It is **idempotent** (a second click reuses the
     already-queued step, never duplicates it) and **fails 409 with `reason:"no-nodes"`** if there are no
     draft nodes to build. It materializes **exactly one** Development Step file into the product's own
     queue (`DEVELOPMENT-STEPS/NEW-STEPS/` under the slot root — see `lib/dev-steps.ts`'s header comment for
     why this is the one true queue, read by Admin `:3002/service/development-steps`), whose sub-steps
     (`tasks[]`) are the draft nodes going into work. **The owner is handed only the step number** — "run
     step #NN" — never the raw brief; the brief itself opens with the mandatory ordered read: (0) this
     automation's complete architecture as one JSON (§5), (1) *this* document, (2) the automation's own files
     on disk (`_data/instruction.md`, `_data/use-cases.ts`, `_data/diagram.ts`, each `_nodes/<slug>/`) — never
     inline in the step, because the step is an **address**, not a stale snapshot.
  4. The coding agent builds each node (§4), calling `POST /api/projects/nodes/<cuid>/materialize` to close
     it — this is what strips `draft`, records a version, regenerates `_data/diagram.ts`, and moves the
     step file to `COMPLETED-STEPS/`.
- **Planned, not yet wired (verify before asserting otherwise):** an automatic test → deploy →
  `deployment_records` write on node/automation completion. The `deployment_records` table exists in the
  schema (`lib/db/index.ts`) but nothing in `materialize/route.ts` or `start-development/route.ts` writes to
  it today — completion only reschedules a rebuild (`scheduleRebuild()`) and closes the step file. Treat any
  "and then it deploys itself" claim as the owner's intended future behaviour, not current fact, until a
  write path is found.

## 4. Building a node or a link (the node → functions contract)

**Full spec:** `app/(projects)/README.md`, sections **"The diagram standard (Master & Instance)"** and
**"The node → functions contract"** — read those in full before writing a node; this section only orients.

- A node is a **typed container of the application's own functions** — `name`, `description`, typed `in`/
  `out`, `conditions`, a `run` mode (`sequential`|`parallel`), stored co-located in its own
  `_nodes/<slug>/{meta.ts,functions.ts,instruction.ts}` (+ `spec.md` only while `draft`). **Co-location is a
  critical invariant**: nothing behavioural ever lives outside a node's own folder, and nothing outside the
  diagram (`_data/diagram.ts`) can define behaviour — no second file, no hardcoded back-door, ever, even if
  explicitly asked for.
- **A node's functions are deterministic application code.** AI is allowed *only* as an explicit
  `NodeFunction.externalAi` tool-call step, never as "the app thinking for itself" — the `FUNCTIONS:
  NodeFunction[]` array in `functions.ts` is metadata (typed signature + rules), cross-referenced by `name`
  for the Builder/agent to introspect; the function **bodies** are ordinary exported `async function`s in
  the same file, compiled normally by Next.js.
- **Proven (step 238 Phase 3 — the first and, as of this writing, only real executing example):**
  `example-content-pipeline`'s `find-sources` node (`_nodes/find-sources/functions.ts`) has real bodies for
  `searchSources`/`dedupeSources` (deterministic, fixture-backed, no AI, no network). A narrowly-scoped route
  (`app/api/projects/nodes/[cuid]/run-real/route.ts`, hardcoded to that one cuid) statically imports and
  calls them, then writes a real `automation_run_nodes` row (`payload: {real:true, ...}`) — distinguishable
  from `test-run`'s pure timing/status simulation (step 227.C, which marks a built node `ok` without invoking
  anything). Live proof: two different inputs (`topic="cats"` vs `topic="purr"`) produced two different,
  correctly-computed outputs (deduped by URL) — not a canned response.
- **Explicitly NOT proven / not built yet:** a *general* "run any node by cuid" executor (dynamic import by
  resolved file path, branching, parallel `run` mode, retries). `run-real` proves the *convention* — a
  compiled, co-located `functions.ts` module genuinely executes — for exactly one node. Building the general
  executor is a separate, later step; do not assume one exists.
- **A link between two automations** (`_edges/<cuid>/`) follows the identical contract, one directory level
  up (`projects/_edges/<cuid>/`, belonging to no single project). It has a **readiness gate**: it can only be
  created between automations with zero draft nodes on either side (409 otherwise, with a machine-readable
  reason) — building a link always touches its endpoint nodes, so they must exist first.
- **The build/hand-off mechanics** (Builder pulls a draft "+" on a node, "Start development" materializes the
  step, the coder's mandatory closing `materialize` call, roll back via `.../versions` + `.../rollback`,
  full-auto draining `GET /api/projects/dev-steps`) are exactly as documented in README §6.1 — this document
  does not repeat them.

## 5. The architecture bundle — the two JSON sources a coding agent needs (proven)

Per the reframe that produced this document: a Development Step should be able to say **one line** ("build
project X") because the agent's own knowledge already covers *how* (this document) and *what exists right
now* comes from one call:

- `GET /api/projects/fetch-complete-automation-architecture-with-history?automation=<category>/<slug>` —
  full state: the **passport** (title, description, immutable type, `isChainedGroup`, the owner's original
  instruction, the raw README, merged entity toggles) + every entity's `instances[]` **and** full `history[]`.
- `GET /api/projects/fetch-current-automation-architecture-snapshot?automation=<category>/<slug>` — same
  passport + entities, **current state only**, no history (cheaper when history isn't needed).

Both are thin orchestrators over `lib/entity-architecture.ts`, which extracts **9 entity types** — `node`,
`edge`, `usecase`, `chain`, `dashboard`, `analytics`, `calendar`, `map`, `processes` — through **one unified
shape** (`lib/entity-store.ts`), so a weak model learns exactly one iteration pattern regardless of entity:

```ts
type EntityInstance<TTask, TIdentity> = {
  ref: string;                 // '' for automation-wide entities; a cuid for node/edge/usecase
  identity: TIdentity;         // descriptive facts — NOT the task
  pending: boolean;            // ALWAYS === (currentTask !== null); never inferred, never drifts
  currentTask: TTask | null;   // null = nothing pending
  history: EntityTaskRecord<TTask>[];  // same TTask shape, wrapped with version/devStepRef/createdAt
};
type EntitySlice<TTask, TIdentity> = { entityType: EntityType; instances: EntityInstance<TTask, TIdentity>[]; error?: string };
```

`node`/`edge`/`usecase` return **one instance per real item** (an automation with hundreds of nodes returns
hundreds of array entries — quantity differs, shape never does); `chain`/`dashboard`/`analytics`/`calendar`/
`map`/`processes` are automation-wide and always return **exactly one instance**, `ref: ""`. Reading any
entity is therefore: find `instances[]` → check `pending` → if true, read `currentTask`.

**Per-entity sub-APIs (proven, 27 routes, 3 per entity type, `<entity>-architecture/*`):**
`add-new-transport-task-entry` (write a new not-yet-developed task), `extract-current-state-for-architecture`,
`extract-full-history-for-architecture`. **The real "handed to a coding agent" event is a `start-development`
call** on the entity (`chain-spec/start-development`, `nodes/<cuid>/start-development`,
`edges/<cuid>/start-development`, or `<stub-entity>-architecture/start-development` for
dashboard/analytics/calendar/map/processes) — **not** a draft save. A `start-development` call archives the
current task into `history[]` (via `archiveAndClearTransport`/`writeVersionByRef`) and clears the pending
slot, in that order, only at that point — confirmed live (step 238 Phase 2): two plain draft saves produced
zero history entries; the following `start-development` produced exactly one.

## 6. Renovating an existing automation (proven entry points)

Three ways to re-open development on a live automation, all converging on the identical "materialize one
Development Step → owner copies the step number → invokes the coding agent" cycle:

1. **Edit a use case** (or add a new one) — `lib/dev-steps.ts`'s `materializeUseCaseStep` queues a step whose
   brief says which case changed and lets the agent work out, from the diagram, which nodes must follow.
2. **Open a node in Builder mode, edit its instruction, click the same "Start development" action** — this is
   an *optimization* (`optimization: true` in `NodeStepInput`), targeting `latest + 1`, not a fresh draft.
3. **The `/architecture` service page** (Admin, `bridges/app/app/service/architecture`) — edit the todo list
   in the right-hand column, click the rocket icon on the left, and the subtree's pending items are queued to
   Development Steps (confirmed present: `subtreePending`/rocket UI in
   `bridges/app/app/service/architecture/_components/architecture-app.client.tsx`, and `POST
   /api/development-steps` in `bridges/app/app/api/development-steps/route.ts`).

Deleting a node commonly breaks the whole automation — always follow deletion with an immediate renovation
cycle, reported as its own Development Step; never leave a deletion unaccompanied by a follow-up plan.

## 7. The Global Automation canvas (`/projects` root, React Flow — proven gating, UI cross-checked lightly)

Every automation is a node on one global canvas; a `chained` automation renders as a **group** container
other automations can be dragged into (React Flow `parentId`/`extent:'parent'`). Edges represent wiring
between specific internal nodes of grouped automations; ungrouped nodes are independent automations, shown
for legibility, draggable into a group at any time. Connecting two automations visually starts a new
Development Steps cycle to define the interaction (a link, §4), gated by the same node-readiness rule.
**Proven:** `GET /api/projects/global` derives overall status as `off` (owner toggled it off) → else
`in-development` if any link (`draftEdges`) is still a draft → else `on`; the global cycle cannot go "on"
while any wired link is unfinished. Per-project `ready`/`drafts` counts feed the same readiness gate used for
creating new links (§4).

## 8. The historical exception — telegram-notes (hard constraint, do not violate)

`telegram-notes` (steps 183–212) runs on a **different, older execution model**
(`_workflow/definition.ts`, the Vercel Workflow SDK) that predates the `_nodes/` standard and is explicitly
**forbidden to treat as an architectural pattern** — never port its file structure or execution mechanism.
Its only remaining value is as a **source of business logic** (what a Telegram notes/reminders bot must
actually do) to eventually port, node by node, into the standard this document describes. It will itself be
rebuilt fresh on this foundation once the architecture work is stable. If you are building a *new* Telegram-
style bot, use this document and the README, never `telegram-notes`'s own code as a template.

## 9. What this document deliberately does not cover

- The full node/diagram/entity-accordion specs — always `app/(projects)/README.md`, by section name.
- A skill file (`.agents/skills/<name>/SKILL.md`, fanned out across `.claude/`/`.codex/`/`.gemini/`/`.qwen/`/
  `.kimi/` per the self-sufficiency doctrine) distilling this document for coding agents — a deliberate,
  separate follow-up once this document itself has proven stable in real Development Step briefs.
