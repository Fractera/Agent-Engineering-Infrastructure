# Projects zone — the code-level contracts

> **Scope discipline:** the automation's state and the agent's duties live in the JSON bundle
> (AUTOMATION-PROJECTS.md §5) — this file only holds the CODE-LEVEL contracts the JSON cannot carry:
> file shapes, declaration types, API mechanics. Everything here is current; if a statement here ever
> disagrees with the bundle's instructions, the bundle wins.

## The diagram standard (Master & Instance)

**🔴 The diagram is the ONLY source of truth.** No second file or definition describes behaviour — a
node exists only in the diagram, behaviour outside it is impossible, and back-doors are refused even if
explicitly asked for. Machine-enforced: `lib/diagram/validate.ts` + `GET /api/projects/validate` flag a
`_workflow/` folder, orphan `_nodes/`, or disallowed node files.

- **Master** = the node sequence that IS the automation (one per automation, always). A fresh automation
  is born with its type's WORKING DEMO pattern (`passport.lifecycleState: "starter-template"` — zero
  weight, reorient it; see the bundle).
- **Instance** (only for `instanced`) = one finite run forked from the Master by reference: a row in
  `automation_instances` (`specialization`, per-node `overrides` = disabled functions / notes). Editing
  an Instance never touches the Master or siblings. Test: "does one request spawn independent finite
  runs, each start→end?" Yes → Master+Instance; no → Master only.
- **Draft lifecycle:** a node is born `draft: true` (`meta.ts` with a stable `cuid`, empty
  `functions.ts`, a `spec.md` brief). Drafts render instantly (DB canvas index) and are ignored by
  execution; any draft ⇒ the automation is "In development" and cannot activate. Materialized ⇒
  non-empty `functions.ts`, no `spec.md`.
- **Build mechanics (the wave era, step 240+):** requirements are STAGED by saving (a non-empty
  `rawRequest`); the page's ONE banner hands the whole batch over as a single step
  (`POST /api/projects/start-development`). The agent builds each node and closes it with the MANDATORY
  `POST /api/projects/nodes/<cuid>/materialize {summary, devStepRef}` (drops draft, records a version,
  regenerates `_data/diagram.ts`); the wave itself is closed by
  `POST /api/projects/development-wave/complete` (moves the step file, unlocks the page, flips the
  lifecycle flag). Full-auto: `GET /api/projects/dev-steps` drains the queue. Rollback:
  `GET .../versions` + `POST .../rollback {version}`.
- **Links between automations** (`projects/_edges/<cuid>/` — same meta/spec/functions contract, owned by
  no project): readiness gate — both endpoints must have zero draft nodes (409 with `gate:{from,to}`;
  read it, build the nodes, retry). Agent loop: `GET /api/projects/global` →
  `GET /api/projects/nodes?automation=…&withPorts=1` (choose endpoints by typed contract) →
  `POST /api/projects/edges {from,to}` → `PATCH /api/projects/edges/<cuid>` (endpoints + spec) →
  `POST .../start-development` → write `_edges/<cuid>/functions.ts` → `POST .../materialize` →
  `GET /api/projects/edges/validate`.

## The node → functions contract

A node is a **typed container of deterministic application functions**, co-located in
`projects/<category>/<slug>/_nodes/<slug>/`:

```
_nodes/<slug>/
  meta.ts          // name, description, typed in/out, conditions, run mode, estDurationMs, cuid, role
  functions.ts     // FUNCTIONS: NodeFunction[] (typed metadata) + the exported async function bodies
  instruction.ts   // the system instruction the functions were generated from
  spec.md          // ONLY while draft — the owner's free-form brief
```

```ts
type NodeFunction = {
  name: string;
  paramsIn: Record<string, TypeSpec>;
  returns: TypeSpec;
  rules?: string[];
  externalAi?: { systemInstruction: string; resultMapping: string }; // ONLY for declared external AI calls
};
type NodeContract = {
  id: string; name: string; description: string;
  in: Record<string, TypeSpec>; out: Record<string, TypeSpec>;
  conditions?: string[]; functions: NodeFunction[];
  run: "sequential" | "parallel"; // metadata today — the executor runs functions sequentially
};
```

- **🔴 Co-location:** no shared/common directory for node code, ever — delete the automation and every
  function vanishes with zero debt. Lifting node functions into `lib/` is prohibited.
- **🔴 No AI "inside the application":** functions are deterministic code; AI only as an explicit
  `externalAi` tool-call step, its full `systemInstruction` always displayed, its answer bound back via
  `resultMapping`.
- **Runtime state:** `automation_runs` (id · automation · instance_id? · current_node · status) +
  `automation_run_nodes` (run_id · node_id · status idle|running|ok|fail). The running node's orange
  frame reads THIS, not a client flag. One model for both types: stream = a run with `instance_id:null`;
  instanced = durable runs per fork.
- **The executor is real** (`lib/executor.ts`, `POST /api/projects/run` — `{automation, input}` for
  stream, `{automation, instanceId}` for instanced): it loads each node's compiled `functions.ts` via the
  generated `_generated/executables.ts` registry and merges returns into the run's context bag. **It runs
  nodes SEQUENTIALLY in diagram order and does not evaluate edges/`when`** — fan-in/fan-out work through
  the bag; condition branching does not (decide conditions inside functions). Not built (step 241):
  edge traversal + condition gating, parallel runs, retries, cross-automation runs.

## The activation (launch console) standard

`_data/activation.ts` declares WHAT ONE RUN TAKES; the shared `ActivationLayer` renders AND runs it —
never a bespoke launch UI. `ActivationSchema = { title?, description?, params: ActivationParam[] }`;
`ActivationParam = { key, label, type: text|longtext|number|date|datetime|boolean|select, required?,
default?, help?, options? }`. **The wiring IS the param's `key`:** the executor drops every param into
the run's context bag; a node's function picks arguments by NAME — `key:"topic"` must equal
`paramsIn:{topic:"string"}` somewhere. Born `EMPTY_ACTIVATION`; `designed = params.length > 0`
(`GET /api/projects/activation`). Branches by type: instanced = forks
(`POST /api/projects/instances/create` + run with `instanceId`); stream = one inline "Ask" (result chips
in the panel, never a toast); chained = no console.

## The settings & tests declaration standard

Declarations live in `_data/` (never `_meta.ts`); shared components render them.

- **Channels** — `_data/channels.ts`: `InputChannel = { name, description, keys: ChannelKey[] }`,
  `ChannelKey = { env, label, help?, optional?, secret? }`. A connector IS an input channel. Required
  env keys derive from channels (`requiredEnvKeys()`) — no parallel list. **The credentials loop
  (step 248):** the declared keys surface in `passport.credentials` with a `present` flag each (never a
  value); a required key with no value shows the amber **missing-keys funnel** in the status bar; a
  `missing-credentials` warning lists its keys and its "Open Settings" button fires the
  `automation:open-settings` event; saving the keys in Settings (`POST /api/project-config/env`)
  **auto-resolves** the warning and appends a **mandatory re-test** to the object's rawRequest — an
  automation is never accepted without a real test with the real keys.
- **Tests** — `_data/tests.ts`: one explicit probe per touched entity, staged input|intermediate|output,
  `binding` either `{type:"shared", kind: openai|telegram|lightrag|google-calendar}` (frozen route
  `app/api/projects/tests/[kind]/`) or `{type:"project", route, method?, body?}`. Route contract:
  `{ ok: boolean; detail?: string }`; user-facing text comes from the declaration's
  `successText`/`errorText`, never free-form.

## The dashboard tables & columns standard

ONE Dashboard tab, ANY number of config-driven tables. Config: `_data/dashboard.ts`
(`PROJECT_DASHBOARD`, types in `_shared/table-config.ts`); renderer: the universal
`config-records-table.client.tsx` — **a column is DATA, never JSX**.

Closed column types (canon `_shared/column-kinds.ts`): `badge` (needs a short enum + colorFrom) · `text`
· `longtext` · `number` (suffix) · `date` (emphasizeIfFuture) · `link` (needs a URL) · `image` ·
`actions` (`source:"id"`; `options.action`, `"live"` needs `liveUrl` with `{field}` tokens — a read-only
re-fetch of a stale snapshot, shown in a modal, never a write). **The rule of enough data:** a column is
justified only when a row can supply what its type needs — otherwise drop it or gather the data first.

Rows live in the DB, not the config: `GET/POST /api/projects/dashboard/rows` (+ `DELETE .../rows/<id>`),
keyed `automation` + `table_id`, all fields in one `values_json` (a live server cannot ALTER a table).
`source:"empty"` = the config's seed renders as a demo until the first live row replaces it.
Newest-first is fixed. Pagination (`pageSize`, default 20) and the search debounce (3+ chars, 3s idle)
are built into the universal table — nothing per project.

## The processes (Gantt) standard

One fork = one row; a fork's bar length = the sum of its nodes' `estDurationMs` (in `meta.ts`, rough is
fine, default 60s). The schedule engine (`lib/schedule.ts`, `automation_schedule`) plans forks as a
priority queue and shifts them by ACTUAL run results; recompute on read, on run finish, and once a
minute from fractera-cron (`POST /api/projects/schedule/tick`).

## Use cases, Quiz, voice — where they are law

The use-cases-first gate, the review gate and the Quiz flow are enforced in code
(`lib/use-cases.ts` `assertUseCasesReviewed`, 409 `no-cases`/`not-reviewed`) and described in the bundle;
this file adds only: the DB is the source (`automation_use_cases`), `_data/use-cases.ts` is a
regenerated artefact — never hand-edit it. Voice is ONE primitive
(`_shared/components/voice-input.client.tsx` + `POST /api/projects/transcribe`) — never a second
microphone or transcription call.

## The project CARD standard

A project's hub card reads ONE hidden block in its `README.md`:
`<!-- fractera:project {"kind":"project","category","slug","title","project":{"title","purpose"},"interface":{...},"nodes":[...]} -->`.
Missing block = a blank card (the known bug); the only fix is emitting a valid block. Keep it valid on
any README edit; extend the reader (`_shared/project-card.ts`), never invent a parallel format.

## Adding a new CATEGORY (owner/ops — not part of building an automation)

Categories are data: edit `_shared/categories.ts` ONLY (add the slug to the union + one object BEFORE
`other` — render order = array order; never duplicate this list). Then create
`projects/<slug>/{page.tsx, _components/index.tsx, _meta.ts, README.md}` by copying `other/` and
substituting slug/title — nothing more; header/footer come from the zone layout. Rebuild, verify
`/projects/<slug>` = 200 + nav + index count. Categories are permanent, never renamed. Creating a
PROJECT is a different operation: always `POST /api/projects/create`, never hand-written files.
