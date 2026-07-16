# AUTOMATION-PROJECTS.md — the short orientation for coding agents

> **The JSON bundle is the law; this document is only the map.** Every automation self-describes through
> one API call (§5): the bundle carries the agent's duties (`agent_instruction`), the field lifecycle
> (`agentFieldContracts`), per-entity instructions, the node budget, the warning escalation and the full
> current state. Read the bundle FIRST and obey it; come back here only for the general picture and the
> addresses. Do not expect deep specs in this file — per-standard specs live in
> `app/(projects)/README.md`, referenced by section name.

## 1. What an automation is (the two-phase doctrine)

Designed **once, expensively** (a strong model builds the node/edge chain inside the workspace) — then
**run cheaply forever** (deterministic code, a weak model or a bare API call executes it; production never
reads the architecture JSON). Every convention exists to keep the run phase cheap: deterministic node
code, typed contracts, and a diagram that is the only place behaviour can live.

## 2. The three types + the node budget

`stream` (no forks — every event runs the same scheme) · `instanced` (each activation forks
Master → Instance with its own parameters) · `chained` (a canvas-only group container of other
automations; no workflow of its own). Chosen at creation, **immutable**.

**The lifecycle flag — `passport.lifecycleState`, two verbatim states.** Every automation is born
`"starter-template"`: its graph is STILL the working demo shipped by the frozen template (stream: parse →
external HTTP → record; `instanced`/`chained` get their real pattern in steps 244/245). The demo is a
**pattern with zero weight**: the owner's rawRequest and use cases always outrank it, reorienting it IS
the job, and reporting a demo-vs-goal mismatch as a blocker/warning is forbidden. Completing the FIRST
development wave flips the flag to `"real-automation"` — mechanically, inside
`development-wave/complete` — and from then on nothing is a demo: every node is live behaviour to
renovate, never to rebuild silently.

### 2.1 Node budget and decomposition (hard law)

≤24 nodes — grow freely (no use case → no node). **25** — you MUST propose a decomposition seam into a
chained group in the same step. **30** — absolute cap: no new node under any phrasing; growth continues
only by decomposition. Why: runtime never degrades with node count, but a coding agent's comprehension of
one automation is bounded — big processes scale only as groups of small, independently fixable members.
Decomposition (own Development Step): cut at the narrowest seam (typed contract first) → parent `chained`
group takes over the public identity → members keep their own pages/diagrams and stay individually
test-runnable (production activation is group-only) → prove parity with two virtual end-to-end tests.
Recursion allowed; the budget applies per member.

## 3. Lifecycle (create → cases → wave → build → complete)

1. **Create:** `POST /api/projects/create` → `createFrozenProject` (template + token substitution, zero
   codegen). One entry point for terminal and agents alike.
2. **Use cases first:** the Quiz opens on first visit and refuses to design nodes until the owner
   describes his scenarios; the **review gate** blocks any hand-off until he confirms the AI understood
   (409 `not-reviewed` / `no-cases`).
3. **The wave:** `POST /api/projects/start-development {automation}` bundles EVERY staged change (any
   instance with a non-empty `rawRequest`) into ONE Development Step in `DEVELOPMENT-STEPS/NEW-STEPS/`
   (the product's one true queue, read by Admin `:3002/service/development-steps`). Idempotent; refuses
   409 `nothing-staged` or `stub-nodes` + names (a never-described node is not handed over). The owner
   gets ONLY the step number; the step is an **address**, not a snapshot — it orders the read: (0) the
   bundle JSON (§5), (1) this file, (2) the automation's own files on disk.
4. **Build:** each node per §4; `POST /api/projects/nodes/<cuid>/materialize` closes a node (strips
   draft, records a version, regenerates `_data/diagram.ts`).
5. **Complete:** `POST /api/projects/development-wave/complete` on a successful build moves the step to
   `COMPLETED-STEPS/` and unlocks the page.

## 4. Building a node

A node is a **typed container of deterministic functions**, co-located in `_nodes/<slug>/{meta.ts,
functions.ts,instruction.ts}` — nothing behavioural outside the node's folder, nothing outside the
diagram defines behaviour, ever. AI inside a node only as an explicit `externalAi` tool-call step. The
general executor (`lib/executor.ts`, `POST /api/projects/run`) walks any automation's nodes and calls
their compiled functions — proven on two reference automations (`example-content-pipeline`,
`example-stream-stock-price`). **The walk is SEQUENTIAL, in diagram order, through one shared context
bag:** fan-in and fan-out work through the bag, but edges/`when` are NOT evaluated — condition nodes do
not gate branches at runtime (decide conditions inside a node's functions; keep chains a linear tree).
Not built yet (step 241, after 244/245): edge traversal + condition branching, parallel execution,
retries, cross-automation runs. Links between automations (`_edges/<cuid>/`) follow the same contract with a readiness gate (zero
draft nodes on both sides). Full specs: README, sections "The diagram standard" and "The node → functions
contract".

### 4.1 The warning escalation (the self-sufficiency cutoff)

Never storm a blocker. The ladder (also in the bundle's instructions — obey that copy): can do myself →
build; missing capability an MCP tool covers → install it yourself; missing data/access (credentials,
captcha, registration) → write a `warning` (`POST /api/projects/entity-warning`) and set the object
aside; owner decision needed → the same, kind `owner-decision`. The warning is **three-layered** (the
bundle's `agentFieldContracts` + agent_instruction 4a carry the full contract): `subject` ≤10 plain
words, `blocker` 1–3 plain sentences for a non-technical owner (≤500 chars, enforced), ALL technical
detail only in `hermesInstruction` — a first-person brief the owner copies to the **Hermes agent** (the
workspace's one-off scout with a browser and extended tools; its report must begin «Согласно вашему
требованию я провёл исследование и вот какие результаты я получил для вас:»). One warning = one blocker.
The owner's answer comes back appended to the object's rawRequest, the pair is archived to history —
read it before re-attempting. Forbidden: second self-attempt of the same kind, stub instead of warning,
calling Hermes yourself, clearing an unfinished rawRequest, bundling problems, demo-mismatch warnings.

## 5. The JSON bundle — the one source of state AND law

- `GET /api/projects/fetch-complete-automation-architecture-with-history?automation=<cat>/<slug>` — full,
  with `history[]`.
- `GET /api/projects/fetch-current-automation-architecture-snapshot?automation=<cat>/<slug>` — current
  state only (cheaper).

Shape (full typing ships in the bundle's own "How it works" modal and
`_shared/architecture-object-types.ts`): `agent_instruction` (your duties — static law) +
`agentFieldContracts` (the trio's lifecycle: `rawRequest`=trigger → SUCCESS fills `summary` /
BLOCKED fills `warning`, rawRequest stays) + `passport` + `diagram` (nodes grouped by role + edges — the
only source of behaviour) + `entities[]` (11 types, one uniform shape). Every instance carries
`rawRequest`/`summary`/`warning` + its static `instruction`. Non-empty `rawRequest` anywhere ⟺ staged
work (that IS the wave's signal). Per-entity sub-APIs (`<entity>-architecture/*`) exist for targeted
reads/writes.

## 6. Renovating a live automation

Same cycle, three entries: edit/add a use case; edit a node's instruction in the Builder; the
`/architecture` service page's todo+rocket. Deleting a node usually breaks the automation — always follow
with an immediate renovation step. Renovation is where the node budget bites: count nodes BEFORE adding
(§2.1).

## 7. The global canvas

Every automation is a node on one canvas (`/projects` root); a `chained` automation is a group container.
Connecting two automations starts a link's own Development Step cycle, gated by node readiness.
`GET /api/projects/global` derives off / in-development / on.

## 8. The historical exception — telegram-notes

Runs on an older execution model (`_workflow/definition.ts`); **forbidden as an architectural pattern**.
Value: business logic reference only. Building a Telegram-style bot → use this document and the README,
never its code.
