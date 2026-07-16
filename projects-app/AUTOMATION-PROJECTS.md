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
| `chained` | A link in a chain of two or more *other* automations (of either type above), in any sequence; renders as a canvas-only **group** container, never gets its own workflow. **Also the mandatory landing shape for any automation that outgrows the node budget (§2.1).** | outreach automation → hands off to a dialog-script automation |

**The starter skeleton ships a WORKING DEMO, and the demo is a pattern — never a requirement (step 243 /
247).** A fresh `stream` automation is born with a real, executing three-node example (parse → external
HTTP call → record-on-success — a stock-quote demo), a working launch console and a live dashboard table;
`instanced`/`chained` still get generic drafts until steps 244/245 give them their own real pattern. The
demo exists ONLY to show a coding agent the working shape of nodes/functions/dashboard. It carries **zero
weight** against the owner's goal: the owner's rawRequest and use cases always outrank it, and reorienting,
renaming or replacing demo nodes to serve the real goal is the agent's NORMAL first-pass work. **Reporting
a demo-vs-goal mismatch as a conflict, blocker or warning is forbidden** — it is not one.

### 2.1 The node budget and forced decomposition into a chained group (owner doctrine 2026-07-16; mechanics planned)

Every `stream`/`instanced` automation has a **node budget**. This is a fundamental scale law, not a style
preference — read it before adding ANY node to ANY automation:

- **≤ 24 nodes** — normal zone. Grow freely, subject to "no use case → no node".
- **25 nodes** — the decomposition threshold. The agent designing or renovating MUST propose a decomposition
  seam to the owner in the same Development Step; growth may continue only while the proposal is pending.
- **30 nodes** — the hard maximum. **No new node may be added, ever.** Any further growth happens ONLY by
  decomposing into a chained group first. There is no owner phrasing that overrides this cap.

**Why (follows from §1's two-phase doctrine):** the *runtime* does not degrade with node count — production
is deterministic code and never reads the architecture JSON. What degrades is *development*: the
architecture bundle grows linearly with nodes, and a coding agent's comprehension of one automation is
bounded. Very large processes therefore scale **only** as a chained group of small automations — each member
independently comprehensible, independently researched, independently tested and independently fixed. Fixing
a bug in a 300-node monolith is archaeology; fixing it in one 20-node member with a clean typed contract at
its seams is routine.

**The decomposition operation (planned; executed as its own Development Step):**

1. **Find the narrowest seam(s):** cut where the fewest edges cross, so each side gets a clean typed
   input/output contract at the cut. The seam contract is designed FIRST, like any boundary (interface-first).
2. **Create the parent `chained` group.** The group **takes over the original automation's public
   identity** — its title and its role as the process's entry. Anything that pointed at the original as an
   entry (links, application pages, external callers) must land on the group afterwards (identity takeover
   preferred; an explicit redirect from the old address is the acceptable fallback).
3. **Create the member automations** (each starting ≤ 25 nodes; e.g. "Medicine" splits into member cards
   "Medicine 1" and "Medicine 2" inside the group "Medicine") and **move the nodes verbatim** — a
   co-location move: each `_nodes/<slug>/` folder travels intact into its member's own tree.
4. **Wire the seams as links** (`_edges/`, §4), under the same readiness gate.
5. **Prove parity before retiring the original:** at least two virtual end-to-end tests walked THROUGH the
   group (one success path, one failure/branch path) must reproduce the original's behaviour.

**Entry, activation and the redirect rule after decomposition (planned):**

- **No member is a standalone product entry.** Production activation happens only through the group: a
  member's launch console is replaced by a pointer to the group's console, and `POST /api/projects/run` must
  refuse a member's standalone production activation (409, `reason:"chained-member"`, naming the group).
- **Members stay individually editable and individually TEST-runnable.** Each member keeps its own page
  (reached from the group, shown with a "member of <group>" banner), its own diagram, entities
  (dashboard/calendar/…), versions and development cycle. Test runs of one member in isolation are exactly
  how a member is researched and fixed separately — forbidding them would make large groups undebuggable.
  Only *production* activation is group-only.
- **Single-pane observability lives at GROUP level.** To see all processes on one page, the owner builds the
  group's own application pages / dashboard / analytics, aggregating across members. Per-member dashboards
  remain as each member's local instruments — both levels coexist.
- **Recursion is allowed and expected:** a group may itself become a member of a larger group. The node
  budget applies per member automation, at every level; a group holds automations, never nodes of its own.

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
     page's ONE hand-off, which since step 240 launches the **development wave**: it bundles **every staged
     change** (every entity instance with a non-empty `rawRequest`, across all entity types — `lib/wave.ts`),
     not only draft nodes, into **exactly one** Development Step file in the product's own queue
     (`DEVELOPMENT-STEPS/NEW-STEPS/` under the slot root — see `lib/dev-steps.ts`'s header comment for why
     this is the one true queue, read by Admin `:3002/service/development-steps`). It is **idempotent** (a
     second call returns the already-queued step's number) and refuses 409 with a machine reason:
     `not-reviewed` (the case gate), `no-cases`, `nothing-staged` (nothing pending anywhere — the pre-wave
     code said `no-nodes`), or `stub-nodes` + the node names (step 247: a node whose spec is still the
     untouched system stub has no requirement to build from — the owner describes it or deletes it first).
     After the hand-off the page LOCKS until the coding agent calls `development-wave/complete` on a
     successful build. **The owner is handed only the step number** — "run step #NN" — never the raw brief;
     the brief opens with the mandatory ordered read: (0) this automation's complete architecture as one
     JSON (§5), (1) *this* document, (2) the automation's own files on disk (`_data/instruction.md`,
     `_data/use-cases.ts`, `_data/diagram.ts`, each `_nodes/<slug>/`) — never inline in the step, because
     the step is an **address**, not a stale snapshot.
  4. The coding agent builds each node (§4), calling `POST /api/projects/nodes/<cuid>/materialize` to close
     it — this is what strips `draft`, records a version and regenerates `_data/diagram.ts`. The WAVE step
     itself is closed by `POST /api/projects/development-wave/complete` on a successful build — that is
     what moves the step file to `COMPLETED-STEPS/` and unlocks the page (step 240).
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
- **Proven (step 241 E1+E2, then extended step 243) — a GENERAL executor now exists and is not a one-off.**
  `lib/executor.ts` walks ANY automation's indexed nodes in order, dynamically loading each one's real
  compiled `functions.ts` through a generated static-import registry (`_generated/executables.ts` — not a
  runtime file-path import, which a `(projects)` route group breaks) and calling its functions by name,
  merging return values back into a shared run context (by function name, by the node's own single `out` key,
  and by spreading a plain-object return — three mechanisms, all live). `POST /api/projects/run` is the one
  entry point for both automation types: `{automation, instanceId}` for an Instanced fork, `{automation,
  input}` for a Stream ask (no fork at all — the fork-precondition gate in `canActivate()` runs only for
  `type==="instanced"`). Refuses cleanly on draft nodes, on a missing executable, or on an empty diagram.
  **Two independent reference automations now prove it, not one:** `example-content-pipeline` (Instanced —
  sequential nodes + a real external AI call via `_shared/external-ai.ts`) and `example-stream-stock-price`
  (Stream — sequential nodes, a multi-function node, and the first plain non-AI external HTTP fetch node in
  the codebase; a thrown error stops the run before the output node, which is exactly why a failed ask never
  writes a dashboard row — no special-casing needed).
- **Still NOT proven / not built:** the node's own `run: "sequential"|"parallel"` field is declared metadata
  only — the executor always runs a node's functions sequentially regardless of its value; true concurrent
  execution has never been exercised anywhere. Retries are not built. A chained (cross-automation) run — one
  automation's node `emit`-ing an event another automation's run reacts to — is not built either (planned for
  a later step; the transport tables/dispatcher exist and are live, but nothing on either end calls them yet).
- **A link between two automations** (`_edges/<cuid>/`) follows the identical contract, one directory level
  up (`projects/_edges/<cuid>/`, belonging to no single project). It has a **readiness gate**: it can only be
  created between automations with zero draft nodes on either side (409 otherwise, with a machine-readable
  reason) — building a link always touches its endpoint nodes, so they must exist first.
- **The build/hand-off mechanics** (Builder pulls a draft "+" on a node, "Start development" materializes the
  step, the coder's mandatory closing `materialize` call, roll back via `.../versions` + `.../rollback`,
  full-auto draining `GET /api/projects/dev-steps`) are exactly as documented in README §6.1 — this document
  does not repeat them.

### 4.1 The self-sufficiency cutoff — the `warning` escalation (step 246; three-layer contract step 247)

A coding agent MUST NOT burn tokens storming a blocker it cannot pass with the means it has. Every object of
the architecture bundle carries a third universal field, **`warning`** (beside `rawRequest`/`summary`): the
agent→owner channel — "here is what blocks me and how to obtain it". Non-empty warning = the object is
BLOCKED; the agent does no further work on it until the owner answers. A warning COEXISTS with the
rawRequest (the task is not done); a warning and a summary are mutually exclusive for one iteration.

**The three-layer contract (step 247 — the first live warning came out as a wall of text useless to both
the owner and Hermes; never again).** ONE warning = ONE blocker of ONE kind — a bundle of questions must be
split into separate warnings. Each layer has exactly one audience:

- **Layer 1 — the framing** — is STATIC UI text (warning-i18n); you never write it. It already tells the
  owner "the agent requested X, could not solve it alone, answer below or use the Hermes agent".
- **Layer 2 — `subject` + `blocker`** — is for a NON-TECHNICAL owner. `subject`: ≤10 plain words in the
  owner's language naming WHAT you need («интеграция с Google Calendar»). `blocker`: 1–3 plain sentences
  (≤500 chars, API-enforced) saying what blocks you and why — no file paths, no identifiers, no quoted
  system stubs, no log dumps.
- **Layer 3 — `hermesInstruction`** — is the ONLY home of technical detail: a first-person brief the owner
  copies to Hermes verbatim — *context (what we build) → what we tried → why it failed → what we need done →
  what to return* (a ready result or a solution scenario, as pasteable text).

**The decision ladder — answer BEFORE building any node, strictly in order:**

1. **Can do myself** (deterministic code + already-wired tools) → build.
2. **Missing a CAPABILITY an MCP tool covers** (web search → exa.ai, and the like) → find, install and wire
   the tool to the node yourself, document it in `functions` — self-service, no warning.
3. **Missing DATA/ACCESS obtainable only by a one-off external action** (credentials, captcha, login-walled
   parsing, stale/fresh data, manual registration) → do NOT storm it. Write the warning
   (`POST /api/projects/entity-warning {automation, entityType, ref, warning:{subject, blocker, kind,
   hermesInstruction?, expectedAnswer?}}`), set THIS object aside, continue the others, finish the wave with
   warnings in place. `kind:"hermes-scout"` MUST carry `hermesInstruction` (the **Hermes agent** is the
   workspace's one-off scout: it drives a browser and fetches such results). Write INTO that instruction the
   requirement that Hermes's report begin verbatim with «Согласно вашему требованию я провёл исследование и
   вот какие результаты я получил для вас:» and return a pasteable text result.
4. **Needs an OWNER DECISION** (a choice, a payment, consent) → the same warning, `kind:"owner-decision"`,
   without a Hermes instruction, with the question.

**Forbidden:** a second self-attempt after a failure of the same kind; faking a result with a stub instead
of a warning; the agent calling Hermes itself (the system forms the call; the OWNER runs it — an automatic
agent→Hermes bridge is a separate future step); clearing a rawRequest whose work was not finished; bundling
two problems into one warning; reporting the starter demo's mismatch with the owner's goal as a warning
(§2 — reorienting the demo IS the job).

**The answer loop (proven):** the owner answers in the problems modal (or the node drawer) →
`POST /api/projects/warning-answer` archives the warning+answer pair to `entity_history` (read it before
re-attempting — it is your context), clears the warning, and APPENDS to the object's rawRequest: «В ответ на
твой warning предоставляю следующую информацию: …». The non-empty rawRequest re-enters the wave; the next
iteration passes the blocker.

## 5. The architecture bundle — the two JSON sources a coding agent needs (proven)

Per the reframe that produced this document: a Development Step should be able to say **one line** ("build
project X") because the agent's own knowledge already covers *how* (this document) and *what exists right
now* comes from one call:

- `GET /api/projects/fetch-complete-automation-architecture-with-history?automation=<category>/<slug>` —
  full state: the **passport** (title, description, immutable type, `isChainedGroup`, the owner's original
  instruction, the raw README, merged entity toggles) + every entity's `instances[]` **and** full `history[]`.
- `GET /api/projects/fetch-current-automation-architecture-snapshot?automation=<category>/<slug>` — same
  passport + entities, **current state only**, no history (cheaper when history isn't needed).

Both are thin orchestrators over `lib/entity-architecture.ts`. **The bundle's shape (live since the
rawRequest/summary refactor, 2026-07-16 — this section IS the current truth; the full typing ships inside
the "How it works" modal and in `_shared/architecture-object-types.ts`):**

```ts
type ArchitectureBundle = {
  automation: string;                       // "<category>/<slug>"
  format: "full-with-history" | "current-snapshot";
  agent_instruction: string;                // the reading agent's duties — static law, includes the
                                            // warning escalation (4a) and the demo-is-a-pattern rule (2a)
  passport: Passport;                       // what this automation IS (title, immutable type, owner's
                                            // original instruction, entity toggles, isChainedGroup)
  diagram: {                                // nodes + edges — the ONLY source of behaviour
    instruction: string;                    // node-building methodology + the 25/30 node budget (§2.1)
    rawRequest: string; summary: string;
    nodes: NodeSlice;                       // role_groups (input/intermediate/output) + instances
    edges: { instruction: string; instances: DiagramEdge[] };
  };
  entities: EntitySlice[];                  // every OTHER entity, one uniform shape
};
```

Every instance — node, edge, use case, or automation-wide entity — carries the **universal trio**:

- **`rawRequest`** — the owner's free-form wish; `""` = nothing pending. "There are staged changes" ⟺
  "some instance has a non-empty rawRequest" — this is the wave's one pending signal (`lib/wave.ts`).
- **`summary`** — the AI's compact "how it works now" (≤300 chars, owner's language), written on finishing.
- **`warning`** — the escalation of §4.1; `""` = none. A warning coexists with the rawRequest, never with a
  fresh summary.

Plus `instruction` (static per-entity law), `identity` (descriptive facts), `pending` (always ===
`currentTask !== null`), `currentTask` and `history[]` (each version wrapped with
version/devStepRef/createdAt; empty in the snapshot format).

The entity set is **11 types**: `node`, `edge`, `usecase`, `chain`, `dashboard`, `analytics`, `calendar`,
`cron`, `map`, `processes`, `fork-activation` (the last exists only on `instanced` automations).
`node`/`edge`/`usecase` return **one instance per real item**; the automation-wide types always return
**exactly one instance**, `ref: ""`. Reading any entity is therefore: find the slice → walk `instances[]` →
a non-empty `rawRequest` is work to do, the `summary` is what already stands.

**Per-entity sub-APIs (27 routes, 3 per entity type, `<entity>-architecture/*`)** still exist for targeted
writes: `add-new-transport-task-entry`, `extract-current-state-for-architecture`,
`extract-full-history-for-architecture`. The "handed to a coding agent" event is the WAVE hand-off (§3) —
it archives each current task into `history[]` and clears the pending slot; a plain draft save stages but
never archives (confirmed live, step 238 Phase 2).

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

**Renovation is where the node budget bites (§2.1):** before adding nodes to a live automation, count the
existing ones. At ≥ 25, propose the decomposition seam in the same step; at 30, refuse to add and decompose
first — renovation requests are the most common way an automation silently outgrows its budget.

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
