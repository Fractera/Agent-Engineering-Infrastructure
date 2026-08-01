# EVERY NODE, WHATEVER ITS KIND

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

## The three outcomes of a middle need (step 307 — the law of the node-skill library)

The frozen middle group is a LIBRARY of node skills: hidden `transform` nodes born with the automation,
each carrying a real, proven function (the law digest lists them as `middleLibrary`). When the build
needs middle logic, it is met in exactly one of THREE ways, checked in this order:

1. **A library skill.** Read `middleLibrary` in the law digest first. If an existing skill does the job —
   reveal that node (or add a node naming its function); never rebuild what the library already carries.
2. **Own code.** Logic no library skill covers is written as a new function in `_lib/nodes/` — one file,
   one function, registered in `_lib/nodes/index.ts` — obeying the folder's law (zod + node builtins only).
3. **A capability with a warning.** Work that reaches OUTSIDE what our own code can do (an MCP server, an
   agent skill, a third-party API) is declared as `capability: needed` with a warning to the owner naming
   what the node must do. The owner supplies the tool; the build pauses there honestly.

**«This automation cannot do it» does not exist as an outcome.** A need that fits no skill and no code is
a `needed` capability plus a warning — never a refusal, never a silent stub.

## One chat, several scenarios = a GROUP of automations (step 307.7 — the hook-gate convention)

v2 has NO N-way router by design: the executor runs every visible node in topological order, and the only
branch is success/failure. So "if the message says A do X, if it says B do Y" is NOT one automation with a
router — it is a GROUP of automations, each self-gating on its own trigger phrase.

The `hookGate` skill (in `middleLibrary`) is how each member gates: it reads the automation's trigger
phrases from `ctx.hookPhrases`, and if the captured text starts with one, it passes the run on with the
tail as the payload; a foreign phrase returns `null` — a lawful stop, so that run simply belongs to a
sibling automation. All members listen to the same channel (one personal Telegram chat); the gate, not a
router, decides whose run it is.

Never add a middle "router" node or an N-way switch. Fundamentally different tasks in one chat → propose a
group of automations (passport.md, the warning duty), one `hookGate` phrase each.

## The conversational boundary is the MODEL's job, not code (step 309)

There are TWO kinds of middle work, and they obey OPPOSITE laws:

- **Data transforms** (parseDate, digitizeMoney, row work) — compute over data. Here the law "work
  maximally WITHOUT AI" holds: deterministic, testable, cheap. The model is used only when the task is
  inherently linguistic (reading a free-text date, itemizing a receipt), and its output is validated
  deterministically.
- **The conversational boundary** — talking to the human (greeting, "who are you", small talk, confirming
  what a run did) — is BY NATURE the model's job. Comfortable dialogue can NOT be a function. This is the
  `converse` helper (role `conversation`), driven by the behavior instruction of the **Assistant tab** plus
  the per-chat dialogue buffer plus Q&A examples. `composeReply` is its deterministic FALLBACK when no model.

**Never enumerate conversational phrases in a node** (a regex list of "кто ты"/"привет"/…) to decide the
reply — that is writing a function where an instruction belongs. Such messages are CONVERSATION: the
classifier returns an empty intent, and the model answers from its instruction (which carries the
assistant's identity and capabilities). Only literal service commands (`/start`, `/help`) are matched in code.

**DATA vs SPEECH when classifying.** A message that STATES data (a fact, an amount, a place, a reminder)
carries a data intent. A QUESTION or request ABOUT already-saved data ("how much did I spend on X", "show
the receipt") is `recall`, never a new record. Money words alone do not mean `finance` — the intent (record
vs ask) does. The model makes this judgement; do not force it with word lists.

## Every store links to every other, both ways (step 309 — crossLink)

Each row of EVERY store (database, finance, vector-memory, storage, map) carries `links:[{table,id}]` to ALL
related rows in the other stores, MUTUALLY. `crossLink` is called by each output after it creates its row: it
writes its siblings into its own row and appends itself into theirs; a later output patches earlier ones, so
the full bidirectional graph converges regardless of order. From any row any relation is retrievable — a
receipt object resolves back to its finance row; a note to its vector doc and its file. "No link" is not a
state that can exist.

## Public access is a role list on the passport (step 309.A)

`passport.access: Role[]` decides who sees the REAL automation on the PUBLIC app (3000): empty = fully public;
a non-empty list means only holders of those roles get the real body, everyone else a teaser. The Projects
layer (3003) stays architect-only — this gates the PUBLIC surface only. Edited from the Assistant tab
("Public access"), written to `passport.access` via `api/patch`.
