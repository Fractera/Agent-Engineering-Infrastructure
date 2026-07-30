# AGENTS.md — start here

You have landed in the folder of ONE automation. Everything the END USER needs — everything that
describes it, runs it and governs it — is inside this folder: the RUNTIME layer is self-contained and
depends only on `zod` + node built-ins, so the folder runs on its own and ships as a ZIP. Read this page
first — it is short on purpose — then read `_instructions/passport.md`, which is the full starting law.

This file is in English because its reader is a model. `ARCHITECTURE.md` is in Russian because its
reader is the owner.

## 0. READ ONLY THE RUNTIME LAYER — skip the dev-slots

Everything that describes and runs this automation for its end user is here: the core (`_data/`), node
functions (`_lib/nodes/`), the public components (`_components/<tab>/public`) and their runtime functions
(`_lib/components/`). That is the whole substance — read it freely.

**You may SKIP the dev-slots.** A few thin client files (`_components/shared/dev-slot.tsx` and
`dev-slot.client.tsx`) only DYNAMICALLY IMPORT external development tools from `_shared-v2` — the "Build
with AI" buttons and the admin settings — behind a fail-silent boundary. They are NOT part of this
automation's substance, do NOT affect what you build, and degrade to nothing if that external layer is
absent. Studying them teaches nothing about this automation — do not spend tokens on them.

This is the RESILIENCE law, "production hard, development soft": the runtime layer above is HARD and lives
in this folder; the development tooling is SOFT and lives outside in `_shared-v2`, reached only through the
dev-slot. Production never depends on the dev layer's life — remove `_shared-v2` and the dev buttons simply
stop appearing while the automation keeps working. You build the hard layer; the soft layer is not yours to
study.

## 0a. 🔒 TWO SURFACES ARE NOT YOURS TO CODE — the DIAGRAM and the USE CASES

**You are NOT authorised to develop the CODE of the diagram (the canvas) or of the use-cases panel. It is
outside your competence as a coding agent, and it is forbidden.** They are not features of this automation —
they are PLATFORM VIEWS derived from the core, and their single copy lives in the development layer
(`_shared-v2/components/{diagram,use-cases}`), identical for every automation in every account.

What you DO own is their DATA, and only through the core:

| Surface | You change | You never touch |
|---|---|---|
| Diagram | `graph.nodes`, `graph.edges` in `_data/automation.json` (via `api/patch`) | the canvas, its layout, its buttons, `graph-to-flow` |
| Use cases | `useCases.cases` (via `api/patch`) | the cases panel, the Quiz, the review gate |

**Why this is a law and not a preference.** The rendering is the same code for every automation. If it lived
in this folder, each automation would carry its own copy, and one "improvement" would make this automation
incompatible with the rest — reuse across accounts would break. Data belongs to the automation; the view
belongs to the platform. Change the data and the view follows, everywhere, unchanged.

If a diagram or a use-cases panel looks wrong to you, that is not a coding task: say so in a `warning` on
the object and let the owner decide. Never reimplement either surface inside this folder.

### The test that tells the two classes apart: does the object have a "Build with AI" form?

| | PLATFORM VIEW | PRODUCT SURFACE |
|---|---|---|
| Examples | diagram, use cases | dashboard tables, calendar, map, control panel, everything below them |
| "Build with AI" request | **none** — nobody designs it | **yes** — the owner sends you a brief |
| Where its code lives | once in `_shared-v2` | **in THIS folder, `_components/<tab>/public/`** |
| Your rights | forbidden to touch | **you develop it — that is the job** |

A PRODUCT SURFACE is yours. The owner writes a brief ("put a video in that column", "build a calculator
inside a cell", "add this logic to the table") — you read the files of THIS folder and implement it in the
public half. Its cell types, its renderers, its behaviour are OPEN: extend them here, in this automation's
own copy. The admin half of such a tab holds ONE thing only — the AI-request form; never move a surface's
logic there, and never expect to find it in `_shared-v2`.

**STAY IN THE STOREFRONT.** The `public/` half is the STOREFRONT — what the end user actually sees and
uses — and that is where a product surface's logic belongs and where you work. Do not drift into the admin
half, the dev-slots or `_shared-v2` to "improve" the development tooling: that is the SOFT layer, not yours
(§0). Build in the storefront; leave the workshop alone.

## 0b. REUSABLE TOOLS EXIST OUTSIDE YOUR FOLDER — wire them, do NOT rebuild

Some capabilities are shared PRIMITIVES the platform already ships — an image cropper, a voice-input
microphone, and more added over time. Their code lives outside your folder (`_shared-v2/tools/`), so
browsing your workspace will NOT reveal them, and you might waste a brief re-implementing one from scratch
(a second cropper, another `MediaRecorder`). Do not.

**Before you build any such affordance, check [`tools-docs/`](tools-docs/) — one short reference per tool:**
what it is, where it lives, how to call it (props in, what comes back), how to persist its output, and its
constraints. If a tool covers the brief, wire the existing one; never copy it into this folder.

Today: [`tools-docs/image-crop.md`](tools-docs/image-crop.md) (crop → JPEG blob → object storage + row),
[`tools-docs/voice-input.md`](tools-docs/voice-input.md) (dictation into a field),
[`tools-docs/map.md`](tools-docs/map.md) (maps, routing, address search, courier TSP — via the `api/geo` door
to the self-hosted geo service; never rebuild a map/router/geocoder),
[`tools-docs/dev-console.md`](tools-docs/dev-console.md) (the terminal you run inside — nothing to wire).

## 0c. EXTERNAL CAPABILITIES — only for the automation that needs one

The tools in §0b are INTERNAL primitives the platform ships. Some automations also reach OUTSIDE the
platform: a node whose function is done not by our code but by an external **MCP server, agent skill or
third-party API** (translate into ten languages, clone a voice, sync lips to new audio). That node records
the binding in its `capability` field.

**Most automations never do this — skip it unless a use case demands an outside tool.** If one does, read
[`tools-docs/external-capabilities.md`](tools-docs/external-capabilities.md) before you wire anything: it is
the one place that explains the field (`type`, `ref`, `tool`, `status: candidate→bound→proven`, `fallback`),
why it never repeats the io-contract (`function`) or the credentials (`envKeys`), and how to prove a binding.
A native node leaves `capability` as `null`.

## 0d. THE MIDDLE LIBRARY — reveal a node skill before you write one

The middle of the graph is a LIBRARY of node skills: hidden `transform` nodes born with the automation,
each carrying a real, proven function (recall from memory, an AI transform, date parsing, reading the
database or object storage, a hook gate). The law digest (`GET api/core`) lists them under
`middleLibrary` — read it before writing any new middle function.

**A middle need is met one of THREE ways, in this order — and no fourth exists:**

1. **A library skill** — an entry in `middleLibrary` already does it → reveal that node (or add one naming
   its function). Never rebuild what the library carries.
2. **Own code** — logic no skill covers → a new function in `_lib/nodes/` (one file, one function,
   registered in `index.ts`), obeying the folder's law (zod + builtins only).
3. **A capability with a warning** — work reaching OUTSIDE our own code (an MCP server, an agent skill, a
   third-party API) → `capability: needed` plus a `warning` to the owner naming what the node must do; the
   owner supplies the tool (§0c), the build pauses there honestly.

**"This automation cannot do it" is not an outcome.** A need that fits no skill and no code is a `needed`
capability plus a warning — never a refusal, never a silent stub. The full law: `_instructions/nodes.md`.

## 0e. AN INCOMING REQUIREMENT LANDS ON THE USE CASES FIRST

The use cases architecturally define what must exist; the send-task box at the top of the page is where
the owner most often drops a new requirement. So when a requirement arrives by ANY development channel —
that box, a `rawRequest` on any object, any dev-request field — your FIRST act is to reconcile it with
the case set (append a case, rework one, or warn about a contradiction — all via `api/patch`), and only
THEN change nodes and edges. A graph changed without its case is unlawful drift. Full law:
`_instructions/useCases.md`; it also rides in the `laws` of the `GET api/core` digest.

## 1. Where the truth is

| What | Where |
|---|---|
| The automation itself — passport, graph, components, use cases, history | `_data/automation.json` (THE CORE) |
| The law of every object in the core | `_instructions/*.md`, one file per law |
| The shape the core must have, in code | `_data/automation.schema.ts` |
| What each node actually does | `_lib/nodes/<function-name>.ts` |
| What each tab shows | `_components/<tab>/` |
| Its data — rows written by runs | `_data/runtime/` |
| Reusable shared tools you may wire (crop, voice, …) | `tools-docs/` (reference); code in `_shared-v2/tools/` |

## 2. READ FILES FREELY. THAT IS NOT A WORKAROUND.

Open any file in this folder with your ordinary tools. Nothing here is hidden behind an API and nothing
requires permission. The read doors below exist to hand a WEAK model one object instead of forty
thousand tokens — they are an economy, not a gate. If you can afford to read, read.

Rough weights, so you can choose: the core ≈ 17k tokens · the schema ≈ 12k · all instructions ≈ 16k.

## 3. WRITING IS DIFFERENT — and this is the part that matters

**Never hand-edit `_data/automation.json` and hope.** It is not a config file; it is a validated
structure with laws that cross objects: ports must match the node's kind word for word, an edge may
only lead where the source's kind allows, two nodes may not claim one function name, a visible node
with a required port must actually carry an edge, group quotas forbid deleting a channel door.

Two lawful ways to change it, in order of preference:

1. **`POST api/patch`** — one object, by address. The whole core is re-validated BEFORE anything is
   written; if the result would be unlawful, nothing is written and you get the violations back in
   words. The write is atomic, identity (`cuid`) is issued by the core, and fields that are derived
   (`cuid`, `kind`, `in`, `out`, `systemInstruction`) are refused by name. The refusal is the teaching.
2. **Edit the file, then run `npm run check:core`** (from `projects-app/`). Same schema, same laws,
   green or a list of violations with exact paths. Use this when you are restructuring several objects
   at once and a per-object door would be clumsy.

What you must never do is edit and *not* check. A broken core does not fail loudly at the moment of the
mistake — it fails later, somewhere else, and the trail is cold.

Real example from this project's own history: an engineer wrote `envKeys` as a list of strings while
the schema required objects. The schema was open in front of him. Reading did not prevent it; the check
caught it before the build.

## 4. The doors (addresses are relative to this automation)

- `GET api/core` — the cover: passport, counts, the law digest (~800 tokens instead of the 12k schema).
- `GET api/core?select=<address>` — one object plus its law attached. A node also gets its kind's law,
  a tab also gets its own law when it has one (`tabInstruction`).
- `GET api/work` — only the objects waiting for work. Start every iteration after the first here.
- `GET api/instruction?name=<name>` — one law by name.
- `POST api/patch` — the only door that changes the core. See `passport.md` §4 for every operation.
- `POST api/run` — execute the automation. `GET/POST api/rows` — output rows. `GET/POST api/env` — keys.

## 5. Four things that get broken most often

1. **A role is for life.** A node never changes its `kind` or its `ioType`. Another role means another
   node.
2. **Adding a channel is additive.** "Add Telegram" never means "remove the control panel". Existing
   names — functions, inputs, outputs — are a public contract: extend, never rename or repurpose.
3. **Input is pushed, never polled.** No polling loop for input, ever. Scheduled work exists for output.
4. **A secret is configuration, not code.** Declare the env key, read it from the environment, write it
   through `api/env`. A key never enters a file of this folder.

## 6. Before you say you are done

Run `npm run check:core`. Green is necessary and not sufficient: it proves the core is lawful, not that
the automation works. Proof of working is a real run with a real result — see `passport.md` §15.

---

**Next: `_instructions/passport.md`.** It is the full starting law — who you are, the order of work,
how a sentence from the owner becomes a graph, and how a stage is closed. Nothing on this page replaces
it; this page only makes sure you find it.
