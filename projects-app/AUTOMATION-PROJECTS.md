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
the job, and reporting a demo-vs-goal mismatch as a blocker/warning is forbidden. The flag flips to
`"real-automation"` mechanically at the FIRST per-object closure that really lands something — a node's
`materialize` or an entity's `entity-summary` (step 249) — and from then on nothing is a demo: every node
is live behaviour to renovate, never to rebuild silently. A blocked object (an open warning, a node still
a draft) never flips anything. (The legacy wave path keeps its own guarded flip inside
`development-wave/complete`.)

### 2.1 Node budget and decomposition (hard law)

≤24 nodes — grow freely (no use case → no node). **25** — you MUST propose a decomposition seam into a
chained group in the same step. **30** — absolute cap: no new node under any phrasing; growth continues
only by decomposition. Why: runtime never degrades with node count, but a coding agent's comprehension of
one automation is bounded — big processes scale only as groups of small, independently fixable members.
Decomposition (own Development Step): cut at the narrowest seam (typed contract first) → parent `chained`
group takes over the public identity → members keep their own pages/diagrams and stay individually
test-runnable (production activation is group-only) → prove parity with two virtual end-to-end tests.
Recursion allowed; the budget applies per member.

**The in-product development agent's FIRST duty is scale assessment (step 250, law 2b in
`agent_instruction`):** over budget → ZERO changes; instead a decomposition recommendation (proposed
automations + a ready-to-paste creation instruction each + a grouping instruction), persisted as an
`owner-decision` warning on `general`. That outcome is a SUCCESS.

## 3. Lifecycle (create → cases → hand-off → build → per-object close)

1. **Create:** `POST /api/projects/create` → `createFrozenProject` (template + token substitution, zero
   codegen). One entry point for terminal and agents alike.
2. **Use cases first:** the Quiz opens on first visit and refuses to design nodes until the owner
   describes his scenarios; the **review gate** blocks any hand-off until he confirms the AI understood
   (409 `not-reviewed` / `no-cases`).
3. **The launch (step 250 — the in-product agent; NO copy hand-off, NO Development Step, NO page lock):**
   "Запустить разработку" runs `POST /api/projects/develop` — an OpenAI Chat Completions tool-calling
   loop streamed live into the launch dialog (SSE). Context = the full bundle (§5, current state, no
   history) + the staged briefs; the model works DELTA-only through narrow per-object tools (write node
   functions → instant compile, wire edges, per-object closes, warnings, finish-with-report). Same gates
   as ever (409 `not-reviewed` / `no-cases` / `nothing-staged` / `stub-nodes` + names). Every press is a
   fresh stateless run — continuity lives in the architecture's state, not in a chat session. The owner's
   FREE comment (the ✦ button — "I know what I dislike, not where to fix it") lands as the `general`
   entity's brief and joins the staged set like any requirement.
   *(`GET /api/projects/handoff` still returns the old full/delta copyable texts as a legacy escape
   hatch for handing work to an external agent manually.)*
4. **Build:** each node per §4.
5. **Close PER OBJECT — no global closing call:** a node → `POST /api/projects/nodes/<cuid>/materialize`
   {summary} (compiles its runtime artifact — the node is LIVE instantly, no rebuild; strips draft,
   records a version, archives its brief to history, asserts the lifecycle flag); any other entity →
   `POST /api/projects/entity-summary` (archives + clears its brief; 409 while the object carries an open
   warning); a blocked object → `POST /api/projects/entity-warning`, its brief stays in place.

   *(The wave path — `start-development` + `development-wave/complete` with a Development Step file and a
   page lock — still exists for compatibility, but the UI no longer drives it.)*

## 4. Building a node

A node is a **typed container of deterministic functions**, co-located in `_nodes/<slug>/{meta.ts,
functions.ts,instruction.ts}` — nothing behavioural outside the node's folder, nothing outside the
diagram defines behaviour, ever. AI inside a node only as an explicit `externalAi` tool-call step. The
general executor (`lib/executor.ts`, `POST /api/projects/run`) walks any automation's nodes and calls
their compiled functions — proven on two reference automations (`example-content-pipeline`,
`example-stream-stock-price`). **A node's live code is its runtime artifact** (step 249):
`materialize` bundles `functions.ts` into `_nodes/<slug>/functions.compiled.mjs` (esbuild,
`lib/node-compile.ts`) and the executor imports that file from disk — editing a node NEVER rebuilds the
app, and a compile error comes back in the materialize response itself. **The walk is SEQUENTIAL, in diagram order, through one shared context
bag:** fan-in and fan-out work through the bag, but edges/`when` are NOT evaluated — condition nodes do
not gate branches at runtime (decide conditions inside a node's functions; keep chains a linear tree).
Not built yet (step 241, after 244/245): edge traversal + condition branching, parallel execution,
retries, cross-automation runs. Links between automations (`_edges/<cuid>/`) follow the same contract with a readiness gate (zero
draft nodes on both sides). Full specs: README, sections "The diagram standard" and "The node → functions
contract".

### 4.1 The warning escalation (the self-sufficiency cutoff)

Never storm a blocker. The ladder (also in the bundle's instructions — obey that copy): can do myself →
build; missing capability an MCP tool covers → install it yourself; missing **permanent credentials** →
declare the channel + warning `missing-credentials` (below); missing **one-off** data/access (captcha,
registration, a consent walk-through) → warning `hermes-scout`; owner decision needed → `owner-decision`.
The warning is **three-layered** (the bundle's `agentFieldContracts` + agent_instruction 4a/4b carry the
full contract): `subject` ≤10 plain words, `blocker` 1–3 plain sentences for a non-technical owner (≤500
chars, enforced), ALL technical detail only in `hermesInstruction`. One warning = one blocker.

**The four kinds and their lifecycles:**

| kind | who resolves | how it clears | what happens next |
|---|---|---|---|
| `hermes-scout` | the Hermes agent (owner copies `hermesInstruction`; report begins «Согласно вашему требованию я провёл исследование и вот какие результаты я получил для вас:») | owner pastes the report into the answer field | answer appended to rawRequest → re-enters the wave |
| `owner-decision` | the owner (the blocker carries the question) | owner writes the decision in the answer field | same |
| `external-service` | nobody can fetch around it — the owner is informed | owner writes how to proceed | same |
| `missing-credentials` (step 248) | the owner, in the **Settings modal** — REQUIRES `keys:[env names]`, the same keys declared as a channel in `_data/channels.ts` | **auto-resolves**: the env write detects all keys present, archives the pair, clears the warning | a **mandatory re-test** is appended to rawRequest — the agent never tested without the keys, so the next iteration must really test before finishing |

The answer (manual or synthetic) is always archived to history with the warning — read the pair before
re-attempting. Check `passport.credentials` BEFORE asking for any key — `present:true` is never requested
again. A secret VALUE met anywhere in the owner's text goes to env at once (`POST /api/project-config/env`);
specs/summaries/git carry only the KEY NAME. Forbidden: second self-attempt of the same kind, stub instead
of warning, calling Hermes yourself, clearing an unfinished rawRequest, bundling problems, demo-mismatch
warnings, asking for a `present:true` key.

### 4.2 Existing connectors — check HERE before writing a hermesInstruction

The workspace already owns connector plumbing; a warning's `hermesInstruction`/`expectedAnswer` must ask
for what THIS plumbing accepts, never invent a parallel format. **The declaration mechanism is the
channels standard** (`_data/channels.ts` — README "settings & tests"): declaring a channel with its keys
is what draws the owner's Settings fields, feeds `passport.credentials`, and arms the auto-resolve of a
`missing-credentials` warning. Known connectors today:

- **Google Calendar** — env `GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET` (the slot's
  `.env.local`, runtime setter of step 143); per-automation OAuth tokens in the `automation_calendar_tokens`
  table; status probe `GET /calendar/status`; full OAuth cycle implemented in
  `personal/telegram-notes/_calendar/google-calendar.ts` — a LOGIC reference only (§8: never copy its file
  structure). So the right `expectedAnswer` for a calendar blocker is the client id/secret pair (+ a
  refresh token when the owner completes consent), not a homemade JSON.
- **Telegram** — per-automation bot token via the channels declaration (`_data/channels.ts`,
  `TELEGRAM_BOT_TOKEN`-style env keys, the step-143 runtime setter) + the automations-listener registry.
- **OpenAI** — ONE global key (`project-config/openai-key`, step 208); per-automation only the model
  (`<SLUG>_MODEL`). Never ask the owner for a second OpenAI key.

When a blocker touches a service NOT listed here, grep the codebase for an existing connector before
drafting the instruction — and say in your warning whether one was found.

## 5. The JSON bundle — the one source of state AND law

- `GET /api/projects/fetch-complete-automation-architecture-with-history?automation=<cat>/<slug>` — full,
  with `history[]`.
- `GET /api/projects/fetch-current-automation-architecture-snapshot?automation=<cat>/<slug>` — current
  state only (cheaper).

Shape (full typing ships in the bundle's own "How it works" modal and
`_shared/architecture-object-types.ts`): `agent_instruction` (your duties — static law) +
`agentFieldContracts` (the trio's lifecycle: `rawRequest`=trigger → SUCCESS fills `summary` /
BLOCKED fills `warning`, rawRequest stays) + `passport` + `diagram` (nodes grouped by role + edges — the
only source of behaviour) + `entities[]` (12 types, one uniform shape; `general` = the owner's free
✦-comment on the whole automation — locating where its fix belongs is the agent's job). Every instance
carries `rawRequest`/`summary`/`warning` + its static `instruction`. Non-empty `rawRequest` anywhere ⟺
staged work. Per-entity sub-APIs (`<entity>-architecture/*`) exist for targeted reads/writes.

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
