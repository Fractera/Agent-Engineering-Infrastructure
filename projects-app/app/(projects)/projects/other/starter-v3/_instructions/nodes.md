# EVERY NODE, WHATEVER ITS KIND

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

ONE NODE = ONE FUNCTION = ONE LOGICAL STEP. A node that seems to need two functions is two nodes:
complexity is carried by the NUMBER of nodes, never by the thickness of one.

## The function contract — `function: { name, summary, accepts, returns }`

One object, never a list.

- `name` — the identifier the code exports: a verb over data (`extract-date`, `format-reply`). Once
  written it is PUBLIC — other nodes and surfaces call it. You may add a name; you may never rename or
  repurpose one.
- `summary`, `accepts`, `returns` — one line each, 200 characters at most. This is a contract, not
  documentation: `accepts` names what the previous node hands over, `returns` names what the next one
  receives, and the two must match along every edge you draw. If naming what it returns needs the word
  "and", this is two nodes.

## Where the code lives

`_lib/nodes/<function-name>.ts` — ONE file per function, and the file name is the kebab-case of the
function name: `ifSuccess` lives in `if-success.ts`, `transformPayload` in `transform-payload.ts`.
The node says WHAT it does; that folder says HOW. Because the name is the address, no two nodes in
this automation may claim the same function name — the core refuses it.

TWO DIFFERENT WRITES — do not confuse them. The node's CONTRACT in the core (its `name`, `description`,
`state`, the `function` fields, its ports) is changed ONLY through the door `POST api/patch`, which
validates the whole core before writing. The function's CODE in `_lib/nodes/<fn>.ts` is written by ORDINARY
file editing — there is no door for code, and none is needed. Contract through the door; code by hand.

## How the function must behave

- DETERMINISTIC: same input, same result. A finished automation runs WITHOUT AI — no model call at run
  time. The ONE sanctioned exception is an EXTERNAL CAPABILITY node (§8.5a of passport): an authorised call
  out to a world tool (an MCP/skill/API — image or video generation, translation). That is not "AI inside
  the app"; it is a declared outward call, and it is the only reason a node's core work leaves its own code.
- NO SIDE EFFECT except the single one this node exists for. Nothing at import time.
- FAIL LOUDLY: on a real failure throw, so the run stops honestly and the `condition-failure` branch
  handles it. Never return an empty value that pretends to be a result.
- Secrets are read from the environment and declared in `envKeys`; input is never polled (passport §14).

## The fields you fill — and what makes them different

| Field | The question it answers |
|---|---|
| `name` | what the owner reads on the canvas |
| `description` | WHY this node exists, in the owner's terms |
| `function.summary` | WHAT the function does, technically |
| `state` | `visible` = the function runs; `hidden` = it does not, data passes straight through |
| `run` | `sequential` — it needs the result of the node before it; `parallel` — it needs nothing from its siblings and may run beside them |
| `estDurationMs` | your honest estimate while building; replace it with the measured value once a real run has happened |
| `info`, `status` | the owner's brief, then your account of what exists (passport §10–11) |
| `warnings`, `envKeys` | what blocked you, and which keys you used (passport §12, §14.4) |
| `capability` | `null` if the function is your own code (the usual case); an object only when it is fulfilled by an EXTERNAL tool (MCP / skill / API) — read `tools-docs/external-capabilities.md` first |

## Never yours to write

`cuid` (identity), `kind` (a role is for life), `in` and `out` (the ports follow from the kind through
the connection table). Another kind means ANOTHER node: add it, hide this one. What a given kind is
allowed to connect to, and which channel it may carry, is stated by its own instruction — `kind.<kind>`.

## Why the layers are built in this ORDER (step 311 — read before touching the middle)

Four of the five layers are FINITE and CLOSED: the doors of arrival, the classes of request, the kinds of
place a result goes, the scopes of self-change. Each is declared in a vocabulary, each node is derived from
it, and each can therefore be frozen once and reused by every automation.

**The middle is the only INFINITE layer.** The logic of the world does not enumerate, so the middle has no
vocabulary, no quota and no closed inventory — it is BUILT, not revealed.

That asymmetry fixes the order of work: **the middle is designed LAST**, because its shape follows from
what reaches it. The front decides what kind of request arrived, and only six of the eleven classes route
into the middle at all (`record-given`, `read-own`, `fetch-external`, `composite`, `control`,
`continuation`); the other five are answered without it. Designing middle work before the front is settled
means designing for requests that may never arrive there — and rewriting it when they do not.

## The three outcomes of a middle need (step 307, revised by step 310)

The middle is infinite, so it is closed by KNOWLEDGE rather than by inventory. When the build needs middle
logic, the need is met in exactly one of THREE ways, checked in this order:

1. **A pattern from the corpus.** Ask the node-pattern corpus how this was solved before. What comes back
   is a PATTERN — the shape of the solution, its context contract, its honest outcomes — **not a file to
   paste**. You write your own code from it, and record the pattern's `lineage` on your node so the fleet
   can tell that this node descends from it. Copying a foreign node's file drags its folder contract, its
   table names and its output-layer assumptions along with it, and that is why copying is not the first
   outcome any more (step 310, owner's decision).
2. **Own code.** Logic no pattern covers is written as a new function in `_lib/nodes/` — one file, one
   function, registered in `_lib/nodes/index.ts` — obeying the folder's law (zod + node builtins only).
   `lineage` stays empty; once the node is proven live it may be contributed to the corpus.
3. **A capability with a warning.** Work that reaches OUTSIDE what our own code can do (an MCP server, an
   agent skill, a third-party API) is declared as `capability: needed` with a warning to the owner naming
   what the node must do. The owner supplies the tool; the build pauses there honestly.

**«This automation cannot do it» does not exist as an outcome.** A need that fits no pattern and no code is
a `needed` capability plus a warning — never a refusal, never a silent stub.

**The corpus is DEV-TIME only.** It is consulted while the automation is being built, never while it runs:
no node may call it at run time, or a client's automation would start depending on our service. The link
between a node and the corpus is one field — `lineage` — and nothing else.

## No routers anywhere — the engine is LINEAR (step 311)

There is no N-way router in this architecture, and adding one is not an improvement but a break. The engine
runs every visible node in topological order; the only branch is success/failure.

Deciding "what kind of request is this" is therefore NOT a router: it is the intent layer, where each class
node judges only its own case, claims the run if it is its own, and otherwise **passes the flow on
unchanged** (an empty patch — never `null`, which would stop the whole run). Precedence is the order of the
class nodes in the core, not a switch statement.

Never add a middle "router" node. Fundamentally different tasks arriving in one chat are a GROUP of
automations, each gating on its own trigger phrase — see `passport.md` (the warning duty) before building
one automation that tries to be several.

## The conversational boundary is the MODEL's job, not code (step 309)

There are TWO kinds of middle work, and they obey OPPOSITE laws:

- **Data transforms** (`resolveMoment`, `fetchExternal`, row work) — compute over data. Here the law "work
  maximally WITHOUT AI" holds: deterministic, testable, cheap. The model is used only when the task is
  inherently linguistic (reading a date out of free text, describing a picture), and its output is validated
  deterministically.
- **The conversational boundary** — talking to the human (greeting, "who are you", small talk, confirming
  what a run did) — is BY NATURE the model's job. Comfortable dialogue can NOT be a function. This is the
  `converse` helper (role `conversation`), driven by the behavior instruction of the **Assistant tab** plus
  the per-chat dialogue buffer plus Q&A examples. `composeReply` is its deterministic FALLBACK when no model.

**Never enumerate conversational phrases in a node** (a regex list of "кто ты"/"привет"/…) to decide the
reply — that is writing a function where an instruction belongs. Such messages are CONVERSATION: the
classifier returns an empty intent, and the model answers from its instruction (which carries the
assistant's identity and capabilities). Only literal service commands (`/start`, `/help`) are matched in code.

**DATA vs SPEECH when classifying.** A message that STATES data carries a data class (`record-given`). A
QUESTION about data already kept is `read-own`, never a new record — asking about a thing is not the thing.
The subject words alone decide nothing; the FORM of the address does. That judgement belongs to the front
layer (`intent`), and the model makes it — do not force it with word lists.

## Every store links to every other, both ways (step 309 — crossLink)

Each row of EVERY store (database, vector-memory, storage, map, calendar) carries `links:[{table,id}]` to ALL
related rows in the other stores, MUTUALLY. `crossLink` is called by each output after it creates its row: it
writes its siblings into its own row and appends itself into theirs; a later output patches earlier ones, so
the full bidirectional graph converges regardless of order. From any row any relation is retrievable — a
stored file resolves back to the record that owns it; a record to its vector document, its map marker and
its calendar event. "No link" is not a state that can exist.

## Public access is a role list on the passport (step 309.A)

`passport.access: Role[]` decides who sees the REAL automation on the PUBLIC app (3000): empty = fully public;
a non-empty list means only holders of those roles get the real body, everyone else a teaser. The Projects
layer (3003) stays architect-only — this gates the PUBLIC surface only. Edited from the Assistant tab
("Public access"), written to `passport.access` via `api/patch`.
