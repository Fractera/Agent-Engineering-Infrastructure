# CLAUDE.md

You are in the folder of ONE automation. This file is self-contained: everything you need to start is
here. Read it, then read only what you are about to touch.

## 🔒 TWO FILES ARE READ IN FULL — ALWAYS, BEFORE YOU TOUCH THE GRAPH

**`_data/automation.json` (the core) and `_data/automation.schema.ts` (the schema). Whole files. Every
session, before your first decision about nodes or edges.** Not by address, not "the part I need", not
"when a refusal is unclear".

**Why, from experience:** you cannot see which connections are LAWFUL from a fragment. A partial read is
how an automation gets edges that compile, pass no law, and quietly do the wrong thing. This is the single
most expensive mistake in the project.

**It is enforced, not requested.** `POST api/patch` refuses `add` / `delete` / `connect` / `disconnect`
with **HTTP 428** unless you send a read receipt:

```
X-Core-Read:   <sha256 of _data/automation.json>
X-Schema-Read: <sha256 of _data/automation.schema.ts>
```

The door recomputes both hashes itself. A stale hash is also refused — if the file changed after you read
it, you are writing against a picture that no longer exists. (`sha256sum <file>`.)

Yes, this costs: **core ≈ 37k tokens · schema ≈ 25k**. Pay it. The 60 instructions (≈45k) are the opposite
case — those you read by name, on demand: `_instructions/<name>.md` or `GET api/instruction?name=<name>`.
`GET api/core` gives the law digest (~800 tokens) — a fast index, never a substitute for the two files.

## Where the truth is

| What | Where |
|---|---|
| The automation itself — passport, graph, components, use cases, history | `_data/automation.json` |
| The law of every object | `_instructions/<name>.md`, one file per law |
| The shape the core must have | `_data/automation.schema.ts` |
| The shape a stored row must have | `_data/record.schema.ts` |
| What a node does | `_lib/nodes/<function-name>.ts` |
| What a tab shows | `_components/<tab>/` — `index.tsx` + `public/` + `admin/` |
| Rows written by runs | `_data/runtime/` |
| Shared tools you may wire | `tools-docs/` |

Read any file here freely — nothing is hidden behind an API.

## Writing to the core

- **Never hand-edit `_data/automation.json` and hope.** Use `POST api/patch` (validates the whole core
  before writing, refuses in words) — or edit the file and run `npm run check:core` from `projects-app/`.
- Editing without checking is the one habit that breaks this project quietly.
- Never writable, by name: `cuid`, `kind`, `in`, `out`, `systemInstructionName`.

## The six layers

`input → intent → middle → speech → output → evolution`

- **Four are finite and CLOSED** by a vocabulary — their nodes are REVEALED, never invented, and their
  function/instruction names are DERIVED from the vocabulary.
- **The middle is the only INFINITE layer** — no vocabulary, no quota. It is BUILT, and built **last**: it
  receives an already-classified run, and only 6 of the 11 request classes reach it.
- **A middle need has exactly THREE outcomes:** a pattern from the node corpus (returns a SHAPE, never a
  file to paste — record its id in `lineage`) → your own code in `_lib/nodes/` → `capability: needed` plus
  a warning to the owner. **"This automation cannot do it" is not an outcome.**
- No routers. The engine is linear; the only branch is success/failure. A class node claims a run or
  returns an EMPTY patch — never `null`, which stops the whole run.
- **SPEECH is its own layer** (`kind.speech.md`): one node writes `ctx.reply`, every channel delivers it,
  no channel composes it. Abilities, addresses and roles are DERIVED from the core each run, never written
  into the behaviour text. The **dialogue plane** (recent messages · outstanding question · chosen
  language) is attached by the engine, readable by any layer, written only here (`group.speech.md`).
- **The dialogue WINDOW is a setting, not a constant** (330.1): `assistant` tab → `data.memory.lastN` /
  `ttlMinutes` decides how much conversation reaches the model, and the engine hands it to `formatDialog`.
  Never hard-code a limit and never assemble the history a second time — a default inside `formatDialog`
  silently beat the owner's setting, and a second form meant the model read one dialogue two ways depending
  on the call path.
- **A conversation OUTLIVES the buffer** (330.5–330.7, `_instructions/memory.conversation.md`): evicted
  turns go to the shared vector index AND to this folder's `conversation` table, joined by `[mem#id]`.
  Reading uses `recallScoped` over `/query/data` and **filters by this automation's address before anything
  is composed** — the index is shared, and citing someone else's conversation is the failure this design
  exists to prevent. The memory always returns its nearest chunks, so off-topic ones are dropped too; given
  no material, speech says it does not remember rather than agreeing.
- **Evicted turns are CONDENSED, never lost** (330.4): they merge into `chat-state.summary`, one paragraph
  under the folder's `SUMMARY_LIMIT`, tagged `[earlier in this session, condensed]` so the model does not
  read the past as just-said. Its cost is reserved before turns compete for the budget.
- **A dialogue turn is an ENVELOPE** (330.3, `TurnSchema` in `_data/record.schema.ts`): class, outcome
  (`ok` · `refused` · `missing` · `unreachable` · `failed`), links to what it created, `runId`. Speech
  BIRTHS it; the engine SEALS the outcome at the end of the run, because speech runs before the outputs and
  cannot know what the stores did. Sealing never rewrites the text.
- **Context is assembled ONCE, under a token budget** (330.2, `_lib/components/conversation/context.ts`).
  `data.memory.tokenBudget` limits what the dialogue may COST, `lastN` how much is worth keeping; the run
  reports `ctx.dialogueBudget` (`used` · `budget` · `dropped` · `limitedBy`), so a shortened memory is never
  mistaken for a stupid model. The engine hands out two slices: `recentDialog` for speech and
  `recentDialogBrief` — the last exchange on a derived share — for reading the request class. **A node that
  builds its own history breaks the budget**: assemble nothing, read the slice you are given.

## 💸 SCALE — this automation carries 2–5 TASKS, and growth goes SIDEWAYS

**The engine runs EVERY VISIBLE node on EVERY run.** Measured: a bare "hello" executed **33 node
functions**. Cost grows linearly with visible nodes and is paid on every message — so node count is not
tidiness, it is the price of every answer. (This corrects the older law, which claimed runtime does not
degrade with node count. It does.)

- **Count WORK nodes — the middle only.** Inputs, intent classes, speech, outputs and evolution are fixed
  by their vocabularies; their number follows the channels that are open, not the tasks. 46 nodes of which
  9 are middle is SMALL.
- **A channel this build does not use stays HIDDEN.** A hidden node does not run: closing an unused door is
  a measurable saving on every run.
- **Asked for something not built? The default answer is ANOTHER AUTOMATION, not another node here.**
  Same job and under budget → build it here. Different job, same channels and stores → a new automation by
  cloning (birth IS a clone of the frozen starter, and it ships with every node hidden — so "clone and
  switch off" is simply "clone and reveal"). Nothing in common → a new one from scratch.
- **Choosing from a LIST beats classifying prose.** With 2–5 tasks the list is exact and costs nothing; the
  intent layer stays as the FALLBACK for text channels (Telegram, email, webhook) where no list can be
  shown. Open-ended conversation about everything is Hermes's job and it pays in tokens — do not turn this
  into that.

Full law with the numbers and the decomposition contract: `_lib/scale-rules.ts` (`SCALE-RULES.md`).

## EVOLUTION — the automation edits ITSELF, after the answer is out

The sixth layer runs **after delivery**: the reply is already with the person, so its work is invisible to
them. Four areas, and they differ by **the right to write**, not by subject:

| area | writes | never |
|---|---|---|
| `voice` | `assistant.data.voice` — `{emoji, length, address}` | content |
| `behavior` | `assistant.data.instruction` — one standing rule, appended | style, or a rule the build cannot carry out |
| `examples` | `assistant.data.qa` — a corrected exchange worth imitating | the instruction |
| `capability-gap` | the `capability-gap` journal — what was asked and is not built | **anything at all in the automation** |

**Read once, write separately.** All four call `readAdjustment` (`components/conversation/adjustment.ts`),
one model call per run, cached by `runId` — the same trick as `guessClass`. It costs NOTHING on an ordinary
run: the model is asked only on classes `control` and `unclaimed`.

**The order of parsing is law, not a hint.** `gap` is decided FIRST and takes the request; `behavior` is then
forced to null. A rule the build cannot carry out is a promise it cannot keep — and the automation was
caught writing exactly that into its own instruction ("send me a weekly report") before this was enforced.

**Silence preserves.** A field the person did not mention in THIS message stays as it was. Saying "call me X"
says nothing about emoji.

**Everything writes through ONE door** — `self-write.ts` — which enforces the safeguards mechanically rather
than by an author's good intentions: an appended change (never a rewrite), a **version in `history`** so the
owner sees what the automation did to itself, nothing personal in the instruction, and a silent skip when no
model is available — evolution never fails a run, it is secondary to the answer. That door reaches ONLY
`assistant.data` and the history: nodes, edges and the passport are not its business.

**A ceiling with a change of MODE.** The instruction travels to the model on every run, so at its limit the
node stops appending and starts **condensing** — the same rules in fewer words. Dropping a rule is a defect.

## 🔒 A node that DECIDES cannot exist without a validator

Applies to `transform`, `condition-success`, `condition-failure` and every `intent` class — anything whose
result changes where the flow goes.

**What it prevents, from a real run:** a fetching node got HTTP 403 from its source and returned "nothing
found" as an ordinary context patch. The engine merged it and moved on — for the graph the node had
SUCCEEDED, and the run reported success while nothing had been fetched. No type check and no schema sees
that: the shape was perfectly valid.

So such a node declares two things in the core, both mandatory:

- **`outcomes`** — at least TWO. Not "ok / not ok": `found` · `missing` · `unreachable` · `not-mine`.
  Each names its condition (`when`) and what it puts into the context (`puts`).
- **`validator`** — the function classifying the result into one of them. Its name is DERIVED from the
  function name (`fetchExternal` → `fetchExternalValidate`) and lives in `_lib/validators.ts`.

**«Unreachable» is not «missing».** A source that refused and a source that answered "nothing" look
identical in the payload and mean opposite things to the human. Telling them apart is the validator's most
valuable job.

Three levels enforce this, each catching what the previous one lets past: the **schema** refuses a node
with no validator or fewer than two outcomes → **module load** fails if the validator is not registered →
the **engine** fails the run when a result matches no declared outcome. Do not try to route around any of
them.

## Tabs are governed by law exactly as nodes are

**Before you change a tab, its entity or its `data`, read `_instructions/components.md`, `tab.md` and
`tab.<name>.md` when it exists** (the core door attaches the last one as `tabInstruction`). A component has
no port table to refuse you, so an unread law here fails later and quieter — not less badly.

- A tab shows what an OUTPUT NODE delivered. It never computes the result itself.
- Add an ENTITY, not a second tab of the same kind.
- Tab settings live in the core (`data`), never as prose in `info`.
- **So do its SOURCE and its SHAPE — every tab, no exceptions:** `entity.data` names the store (`table`),
  the columns/fields and the page size; the component only renders them. Hard-coding either inside a
  component creates a second, private truth — it cost four tabs in one day, the map among them.
- **A ROW LEADS TO THE ENTITY:** a click on a row or a marker opens the ONE shared drawer
  (`shared/entity-drawer.client.tsx`) with the record and every facet linked to it. A tab never builds its
  own "details" view and never restyles the drawer.

## 🔒 Two surfaces you must NOT code

The **diagram** and the **use-cases panel** are PLATFORM views: one copy, identical in every account. You
change only their DATA in the core (`graph.nodes` / `graph.edges`, `useCases.cases`) through `api/patch`.
Reimplementing either inside this folder breaks reuse between accounts. If one looks wrong, say so in a
`warning` and let the owner decide.

## What a run leaves behind

- **Full text goes to the vector store; the database record holds a SUMMARY plus links.** That is why two
  stores exist.
- **Links have ONE representation:** `links: [{table,id}]`, both ways, set by the write itself
  (`addEntityRow`), never by the node. A row cannot be born unlinked.
- **Entity store vs run journal.** Stores (`database`, `vector-memory`, `storage`, `map`, `calendar`) write
  only when the run actually creates something. Journals (`history`, `analytics`, `toast`) always write.
  **The toast is the DEFAULT DESTINATION:** whatever the automation must tell the human goes out through a
  connected channel, and with none connected it goes to the toast — a due calendar moment included.
  "Nobody was told" is not an expressible state (`output.toast.md`).
  **Asking is not saving:** a question-class run leaves no record.

## Use cases

They carry ONLY what makes THIS automation different — its subject area and this owner's scenario. Anything
true of every automation is LAW, never a case. Test before writing one: remove the description; if the
behaviour still cannot be violated, it is law and has no place in the cases.

An incoming requirement lands on the cases FIRST, then on the graph. A frozen template ships with no cases.

## Four laws that are never bent

1. **A role is for life.** A node never changes its `kind` or `ioType`. Another role means another node.
2. **Adding a channel is additive.** "Add Telegram" never means "remove the control panel". Existing names
   are a public contract: extend, never rename or repurpose.
3. **Input is pushed, never polled.** No polling loop for input, ever.
4. **A secret is configuration, not code.** Declare the env key, read it from the environment, write it
   through `api/env`. A key never enters a file of this folder.

## Instructions you write

English and compact — their reader is a model that must also read the core. Every line is paid on every
session. Prune before you append; never restate what another instruction says — link to it by name.

## Reusable tools

Before building a microphone, a cropper, a map, a media player or a terminal — read `tools-docs/`. If a tool
covers the brief, wire the existing one; never copy it into this folder, never hand-roll a second one.

| Tool | Use it for |
|---|---|
| `media-viewer` | showing a stored object: preview cell + viewer (image · video · audio · PDF · text) |
| `voice-input` | dictation into a text field |
| `image-crop` | crop an image to a JPEG blob before storing it |
| `map` | maps, routes, address search — through the `api/geo` door only |
| `dev-console` | the terminal you already run inside |
| `external-capabilities` | when a node's work must reach an MCP server / skill / third-party API |

## Before you say you are done

`npm run check:core` green proves the core is LAWFUL — not that the automation WORKS. Proof of working is a
real run with a real result you can show.
