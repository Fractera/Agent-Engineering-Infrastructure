# AGENTS.md

Self-contained brief for a coding agent working in the folder of ONE automation. Everything needed to
start is on this page; read the rest by name, on demand.

## Project

An automation is a **declaration, not a program**. It declares itself in one file — `_data/automation.json`
(the core) — and everything follows from it: what the canvas draws, what tabs the owner sees, what a run
executes.

The **runtime layer** (core, node functions, `_components/<tab>/public`, `_lib/`) is self-contained: `zod`
and Node built-ins only, and it ships as a ZIP. The **development layer** (`_shared-v2`: "Build with AI"
buttons, admin settings) is soft and reached only through the fail-silent dev-slot files. Production never
depends on its life. **You build the hard layer; skip the dev-slots — they teach nothing here.**

## Layout

```
_data/  core + its schema + the row schema   _instructions/  the law, one file per object kind
_lib/   engine, nodes, stores, transport     _components/    one folder per tab (index+public+admin)
api/    core·work·instruction·patch·run·rows·env   tools-docs/  reference for the shared tools
_data/runtime/  rows written by runs (not in git)
```

## Commands

Run from `projects-app/`:

```bash
npm run check:core            # the core obeys its schema and cross-object laws
npm run check:tab-structure   # every tab folder is index.tsx + public/ + admin/
npm run check:entity-imports  # the public layer reaches nothing outside the folder
```

Build and restart happen on the server, never on a developer's Windows box.

## 🔒 Mandatory full read — two files, no exceptions

**Before your first decision about nodes or edges, read IN FULL:**

1. `_data/automation.json` — the core;
2. `_data/automation.schema.ts` — the schema.

Whole files. Not by address, not "the part I need", not "only when a refusal is unclear". **You cannot see
which connections are LAWFUL from a fragment** — a partial read is how an automation ends up with edges
that compile, satisfy no law, and quietly do the wrong thing.

**Enforced by the write door, not merely requested.** `POST api/patch` answers **HTTP 428** to `add`,
`delete`, `connect` and `disconnect` unless the request carries a read receipt:

```
X-Core-Read:   <sha256 of _data/automation.json>      # sha256sum _data/automation.json
X-Schema-Read: <sha256 of _data/automation.schema.ts> # sha256sum _data/automation.schema.ts
```

The door recomputes both hashes from disk. A stale hash is refused too: if a file changed after you read
it, your write is aimed at a picture that no longer exists. (`set` and `visibility` are exempt — the owner
drives those from the interface.)

The cost is real and it is paid on purpose: **core ≈ 37k tokens · schema ≈ 25k.**

## Reading everything else — by name, on demand

- `GET api/core` — the law digest (~800 tokens): connection table, quotas, vocabularies, and the laws not
  expressible as a table. A fast index, **never a substitute** for the two files above.
- `GET api/core?select=<address>` — one object with its law attached (a node gets its kind's law; a tab
  gets `tabInstruction` when it has one). `GET api/instruction?name=<name>` — one law by name.
- Later iterations start at `GET api/work` — only what waits for work. Empty list is a lawful end: say so.
- The 61 instructions weigh ≈45k tokens together — that is exactly why they are read by name.

## Writing to the core

Two lawful ways, in order of preference:

1. **`POST api/patch`** — one object by address. The whole core is re-validated BEFORE anything is written;
   unlawful results are refused in words and nothing is stored. The refusal is the teaching.
2. **Edit the file, then `npm run check:core`** — same schema, same laws. Use when restructuring several
   objects at once.

Never edit and *not* check: a broken core fails later, elsewhere, with a cold trail. Derived fields are
refused by name: `cuid`, `kind`, `in`, `out`, `systemInstructionName`.

## Architecture — six layers

`input → intent → middle → speech → output → evolution`

Four layers are finite and CLOSED by a vocabulary: their nodes are revealed, never invented, and their
function and instruction names are derived from that vocabulary. **The middle is the only infinite layer**
— no vocabulary, no quota — so it is BUILT, and built **last**: it receives an already-classified run, and
only 6 of 11 request classes reach it at all.

**How a middle node is born — three outcomes, no fourth:**

1. a **pattern** from the node corpus — it returns the SHAPE of a solution, never a file to paste; write
   your own code from it and record the pattern id in the node's `lineage`;
2. **your own code** in `_lib/nodes/` — one file, one function, registered in `index.ts`, `lineage` empty;
3. **`capability: needed`** plus a warning naming what the node must do — the owner supplies the tool.

**"This automation cannot do it" is not an outcome.** The corpus is dev-time only: a running automation
never contacts it.

No routers anywhere — the engine is linear and the only branch is success/failure. A class node claims a
run or returns an EMPTY patch; `null` stops the whole run.

**SPEECH is a layer, not a middle node** (`kind.speech.md`). One node, `converse`, writes `ctx.reply` — the
one answer every channel then delivers; a channel never composes speech. It sits after the front and the
middle because the answer is CONTENT and five of the eleven request classes never reach the middle at all.
Its abilities, addresses and access roles are DERIVED from the core each run — never written into the
behaviour text, which is why the assistant cannot promise what the build does not have.

**The dialogue plane** is the axis a single run does not have: the recent messages, the outstanding question
and the chosen language live with the interlocutor and outlive runs. The engine attaches it once per run,
any layer may read it, and **only the speech layer writes it** (`group.speech.md`).

**Its window is a SETTING, not a constant** (330.1). How much of the conversation reaches the model is
`assistant` tab → `data.memory` (`lastN` messages, `ttlMinutes` of silence before the buffer is a clean new
session); the engine reads it and hands it to `formatDialog`. Two rules follow, and both were paid for:
never hard-code a limit — a default inside `formatDialog` silently beat the owner's setting, which then
promised control it did not have; and never assemble the history a second time — one dialogue rendered in
two forms is one conversation read two ways, and which one the model saw depended on the call path.

**The context is assembled ONCE, under a TOKEN BUDGET** (330.2,
`_lib/components/conversation/context.ts`). `data.memory.tokenBudget` caps what the dialogue may COST,
`lastN` caps how much is worth keeping, and the one that binds first wins — counting messages alone is a
bad measure, since one dictated voice message outweighs twenty typed ones. Eviction removes the OLDEST
message WHOLE: half a line is worse than none, because the model completes it and sounds certain. The run
reports the price in `ctx.dialogueBudget` (`used` · `budget` · `dropped` · `limitedBy`), so a memory cut
short is never mistaken for a stupid model.

**A conversation OUTLIVES the buffer** (330.5–330.7 — the law is `_instructions/memory.conversation.md`,
read it before touching memory). An evicted turn goes to TWO homes: the shared vector index (meaning) and
this folder's `conversation` table (ownership, exact text, and the TIME — a memory chunk carries no date at
all). They are joined by the marker `[mem#id]` written into the indexed text.

Three rules make it honest, and each was paid for by a live failure: provenance names the kind
(`kind=conversation` vs `fact`), reading filters by THIS automation's address before anything is composed
(`recallScoped` over `/query/data` — the synthesized answer of `/query` mixes every automation on the server
and cannot be filtered afterwards), and relevance is judged by us because `hybrid` retrieval always returns
its nearest chunks and never says "nothing found". Given no material, speech says it does not remember:
agreeing without excerpts is the worst lie here, indistinguishable from truth until the person checks.

**What falls out of the buffer is CONDENSED, not lost** (330.4). The window and the TTL DELETE turns — a
long conversation used to lose its own beginning for good, and the assistant honestly did not know what the
first half was about. Evicted lines now merge into `chat-state.summary`: one paragraph under the folder's
single `SUMMARY_LIMIT`, written by a model (what was discussed, not which words were used) or, with no
model available, a plain OUTLINE of the openings — labelled as an outline, never an invented recap. The
summary's cost is RESERVED before turns compete for the budget: a hundred tokens that cover the entire
evicted conversation beat two more verbatim lines. It always carries the tag
`[earlier in this session, condensed]`, because unlabelled past reads as just-said.

**The OPENING is pinned, and the summary does NOT cover it** (332.B, caught by a live check). Eviction ran
strictly from the bottom, so the turn that NAMES the subject went first: 'the wedding is in X' → three
turns of small talk → 'which city?' → 'I don't find that here.' The distinction that made this invisible:
the summary is written when turns leave the BUFFER, while the budget evicts at READ time — nothing was
condensed there, the lines were simply not sent. Now the first SUBSTANTIAL turn of the PERSON is reserved
(a greeting anchors nothing; a bot turn never anchors, it carries a verdict — same contamination lesson as
`userTurnsOnly`), capped at a share of the budget so a huge opening cannot crowd out the present, and if
anything is dropped between it and the recent turns the gap is stated in words — two distant lines printed
as neighbours make the model confident about an order of events that never happened.

**A turn is an ENVELOPE, not a line** (330.3, `TurnSchema` in `_data/record.schema.ts`). It carries what
the run was (`class`), how it ended (`outcome`: `ok` · `refused` · `missing` · `unreachable` · `failed`),
what it left in the stores (`links`) and which run it was (`runId`). Without it the model reread a smooth
conversation where a run had actually failed, and carried on confidently on top of the failure. The
rendering prints the outcome only when it is NOT `ok`: success is the norm, and a label on every line is
tokens paid for silence.

**Speech births the turn, the engine seals it.** Text, class and time are written by the speech node — the
single author of the dialogue plane. The `outcome` and the created rows are stamped at the END of the run
(`sealTurns`), because speech stands BEFORE the outputs: while it speaks, no store has run, so those facts
do not exist yet for it. This is not a second author — it is `updatedAt`, and it never touches the text.

The engine hands out **two slices, and it decides the sizes**: `recentDialog` — the conversation, for the
speech layer; `recentDialogBrief` — the last exchange only, on a derived share of the budget, for reading
the request class (that read happens on EVERY run, so it must stay cheap). **Never assemble history inside
a node** — that is exactly how the budget stops being anyone's.

## 💸 SCALE — 2–5 TASKS per automation, and growth goes SIDEWAYS

**The engine runs EVERY VISIBLE node on EVERY run** — measured: a bare "hello" executed **33 node
functions**, nine returning empty. Cost grows linearly with visible nodes and is paid on every message.
Node count is not tidiness; it is the price of every answer. (The older law claimed runtime does not
degrade with node count. The measurement says otherwise, and this replaces it.)

**Count WORK nodes — the middle only.** Inputs, intent classes, speech, outputs and evolution are fixed by
their vocabularies: their number follows the open channels, not the tasks. 46 nodes of which 9 are middle
is a SMALL build. And a channel this build does not use must stay HIDDEN — a hidden node does not run, so
closing an unused door is a real saving, not housekeeping.

**Asked for something not built? The default answer is ANOTHER AUTOMATION, not another node here.** Same
job and under budget → build it here. Different job but the same channels and stores → a new automation by
CLONING (birth already IS a clone of the frozen starter, which ships with every node hidden — so "clone it
and switch off what I don't need" is simply "clone it and reveal what I do"). Nothing in common → from
scratch. Say the reason to the person: an extra ability is paid on EVERY run, not once.

**Choosing from a LIST beats classifying prose.** With 2–5 tasks a list of tasks is exact and free; the
intent layer remains the FALLBACK for text channels (Telegram, email, webhook), where no list can be shown.
Open-ended conversation about anything is Hermes's job and it pays in tokens — do not turn this into that.


**How the list is built and what it buys.** Tasks come from `useCases.cases` — a task IS a use case, so
there is no second list to keep in step (`_components/control-panel/tasks.ts`). The chosen task travels with
the run as `taskCase`, and that is not decoration: the person picked from what this build CAN do, so
`checkCoverage` KNOWS the coverage instead of judging it.

**What it buys is EXACTNESS, not a cheaper run** — measured 2026-08-04, correcting the first version of this
paragraph. `checkCoverage` shares ONE cached adjustment read with the evolution layer, which pays for it on
these classes anyway: the list removes a guess, not a model call. The saving the doctrine promises comes
from FEWER NODES. The check that holds this honest is
`_checks/cases.json → choosing-from-the-list-decides-coverage-without-guessing`.

## 🔒 BEHAVIOUR IS PROVED BY RUNNING IT — `npm run check:behavior`

`check:core` proves the core is LAWFUL and cannot prove the automation WORKS: every defect of the last
three steps compiled, passed the schema, and still lied. `_checks/cases.json` is the fixed set of live runs
that catches that class — six cases today, each recording what it COST (`fn` = node functions, `model` =
model calls), and a case fails when its price grows. Run it after every change to nodes, speech or
evolution, and read `_checks/readme.md` before adding a case: a case is born from a defect, not from a
feature.

Numbers and the decomposition contract: `_lib/scale-rules.ts` (shipped as `SCALE-RULES.md`).

## EVOLUTION — the automation edits ITSELF, after the answer is out

The sixth layer runs **after delivery**: the reply is already with the person, so its work is invisible to
them. Its four areas differ by **the right to write**, not by subject — `voice` writes
`assistant.data.voice` (`{emoji, length, address}`), `behavior` appends one standing rule to
`assistant.data.instruction`, `examples` adds a corrected exchange to `assistant.data.qa`, and
`capability-gap` writes only to its own journal and **changes nothing in the automation**.

**Read once, write separately.** All four call `readAdjustment` — one model call per run, cached by `runId`
(the `guessClass` trick). On an ordinary run it costs nothing: the model is asked only on classes `control`
and `unclaimed`.

**The order of parsing is law.** `gap` is decided FIRST and takes the request; `behavior` is then forced to
null in code. A rule the build cannot carry out is a promise it cannot keep — before this was enforced, the
automation wrote "send me a weekly report" into its own instruction and thereby promised what it has no way
to do. **Silence preserves:** a field not mentioned in THIS message stays as it was.

**One door for every write** — `self-write.ts` — enforcing the safeguards mechanically instead of by an
author's good intentions: append, never rewrite; a **version in `history`** so the owner sees what the
automation did to itself; nothing personal in the instruction; and a silent skip when no model is available,
because evolution is secondary to the answer and must never fail a run. The door reaches ONLY
`assistant.data` and the history — nodes, edges and the passport are out of its reach.

**A ceiling with a change of MODE:** the instruction is sent to the model on every run, so at its limit the
node stops appending and starts condensing — the same rules in fewer words. Dropping a rule is a defect.

## 🔒 A node that decides cannot exist without a validator

Applies to `transform`, `condition-success`, `condition-failure` and every `intent` class — anything whose
result decides where the flow goes.

**The failure it removes, observed live:** a fetching node got HTTP 403 and returned "nothing found" as an
ordinary context patch. For the graph the node had SUCCEEDED — the run reported success while nothing was
fetched. No type check and no schema sees that: the shape was valid.

Such a node declares both of these in the core:

- **`outcomes`** — at least TWO, and not "ok / not ok": `found` · `missing` · `unreachable` · `not-mine`.
  Each names its condition (`when`) and what it puts into the context (`puts`).
- **`validator`** — the function that classifies the result into one of them. Its name is DERIVED from the
  function name (`fetchExternal` → `fetchExternalValidate`), never chosen, and it lives in
  `_lib/validators.ts`.

**"Unreachable" is not "missing".** A source that refused and a source that answered "nothing" are
identical in the payload and opposite in meaning. Separating them is the validator's most valuable job.

Enforcement is three-level, each catching what the previous one lets past:

| Level | Catches |
|---|---|
| the schema | no validator, a foreign validator name, fewer than two outcomes |
| module load (`_lib/validators.ts`) | a validator declared in the core but not registered |
| the engine (`_lib/executor.ts`) | a result the validator cannot name → the run fails honestly, with the reason |

## Tabs are governed by law exactly as nodes are

**Read `_instructions/components.md`, `tab.md` and `tab.<name>.md` (when it exists) BEFORE changing a tab,
its entity or its `data`.** A component has no port table to refuse you, so an unread law here fails later
and quieter than a bad edge — not less badly.

A tab shows what an output node DELIVERED; it never computes the result. Add an entity rather than a second
tab of the same kind. Settings live in the core (`data`), not as prose in `info`.

**Its SOURCE and its SHAPE live there too — every tab, no exceptions.** `entity.data` names the store
(`table`), the columns/fields and the page size; the component only renders them. A source or a column list
hard-coded in a component is a second, private truth: it cost four tabs in a single day — a stale table, two
undeclared lists, and a map that drew nothing while the runs faithfully wrote and linked their markers.

**And a ROW LEADS TO THE ENTITY.** Clicking a row or a marker opens the ONE shared drawer
(`shared/entity-drawer.client.tsx`, opened by the shared table) with the record and every facet linked to
it. Never build a second "details" view inside a tab; never restyle the drawer per tab.

## 🔒 Two surfaces are not yours to code

The **diagram** and the **use-cases panel** are PLATFORM views — one copy, identical in every account. You
own their DATA only: `graph.nodes` / `graph.edges` and `useCases.cases`, through `api/patch`. Coding either
inside this folder breaks reuse between accounts. If one looks wrong, write a `warning` and let the owner
decide.

Everything else — dashboard tables, calendar, map, control panel — is a PRODUCT SURFACE: you develop it, in
the `public/` half. The `admin/` half holds one thing only, the AI-request form.

## What a run leaves behind

- **Full text goes to the vector store; the record holds a SUMMARY plus links** — that is why two stores.
- **Links have ONE representation** — `links: [{table,id}]`, mutual, set by the write itself
  (`addEntityRow`), never by the node. A row cannot be born unlinked.
- **Entity store vs run journal.** Stores (`database`, `vector-memory`, `storage`, `map`, `calendar`) write
  only when the run creates something; journals (`history`, `analytics`, `toast`) always write. **The toast
  is also the DEFAULT DESTINATION:** anything the automation must tell the human goes out through a
  connected channel, and with no channel connected it goes to the toast — including a deferred announcement
  such as a due calendar moment. "Nobody was told" is not an expressible state (`output.toast.md`). **Asking is
  not saving** — a question-class run leaves no record. Full shape: `records.md`.

## Use cases

A case carries ONLY the distinctive: the subject area and this owner's scenario. Anything true of every
automation is LAW, never a case — test it by removing the description: if the behaviour still cannot be
violated, it is law. A requirement lands on the cases first, then on the graph; a frozen template ships
with none.

## Four laws that are never bent

1. **A role is for life** — a node never changes its `kind` or `ioType`.
2. **Adding a channel is additive** — existing names are a public contract: extend, never rename.
3. **Input is pushed, never polled** — scheduled work exists for output.
4. **A secret is configuration, not code** — declare the env key, read it from the environment, write it
   through `api/env`.

## Shared tools

Before building a microphone, an image cropper, a map/route/geocoder, a media player or a terminal, read
`tools-docs/`. Wire the existing primitive; never copy it into this folder and never hand-roll a second one.

| Tool | Use it for |
|---|---|
| `media-viewer` | showing a stored object: the preview cell and the viewer (image · video · audio · PDF · text) |
| `voice-input` | dictation into a text field |
| `image-crop` | cropping an image to a JPEG blob before it is stored |
| `map` | maps, routes, address search — only through the `api/geo` door |
| `dev-console` | the terminal you are already running inside |
| `external-capabilities` | a node whose work must reach an MCP server, an agent skill or a third-party API |

Each file states what it is, where it lives, how to call it and its constraints. Read the one you need.

## Instructions you write

English and compact — the reader is a model that must also read the core. Prune before you append; never
restate what another instruction already says, link to it by name.

## Definition of done

`npm run check:core` green proves the core is LAWFUL — not that the automation WORKS. Done means a real run
with a real result you can show.
