# AGENTS.md

Self-contained brief for a coding agent working in the folder of ONE automation. Everything needed to
start is on this page; read the rest by name, on demand.

## Project

An automation is a **declaration, not a program**. It declares itself in one file — `_data/automation.json`
(the core) — and everything follows from it: what the canvas draws, what tabs the owner sees, what a run
executes.

The **runtime layer** (core, node functions, `_components/<tab>/public`, `_lib/`) is self-contained: it
depends on `zod` and Node built-ins only, and ships as a ZIP. The **development layer** (`_shared-v2`:
"Build with AI" buttons, admin settings) is soft and reached only through the fail-silent dev-slot files
(`_components/shared/dev-slot*.tsx`). Production never depends on the dev layer's life. **You build the
hard layer. Skip the dev-slot files — they teach nothing about this automation.**

## Layout

```
_data/          core + schema of the core + schema of a stored row
_instructions/  the law, one file per object kind, read by name
_lib/           engine, node functions (_lib/nodes/<function-name>.ts), stores, transport
_components/    one folder per tab: index.tsx + public/ + admin/
api/            doors: core · work · instruction · patch · run · rows · env
tools-docs/     reference for shared tools you may wire
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

## Read order and budget

1. **`GET api/core` first** — the law digest, ~800 tokens: what may connect to what, group quotas,
   vocabularies, the handful of laws that are not expressible as a table. It is AUTHORITATIVE; prose only
   supplements it.
2. Then only the objects you need: `GET api/core?select=<address>` (a node also gets its kind's law; a tab
   also gets `tabInstruction` when it has one), or `GET api/instruction?name=<name>`.
3. On later iterations start at `GET api/work` — only the objects waiting for work. Empty list is a lawful
   end: say so and stop.

Measured weights: **core ≈ 37k tokens · schema ≈ 25k · 60 instructions ≈ 45k.** Reading everything is not
an option.

## Writing to the core

Two lawful ways, in order of preference:

1. **`POST api/patch`** — one object by address. The whole core is re-validated BEFORE anything is written;
   unlawful results are refused in words and nothing is stored. The refusal is the teaching.
2. **Edit the file, then `npm run check:core`** — same schema, same laws. Use when restructuring several
   objects at once.

Never edit and *not* check: a broken core fails later, elsewhere, with a cold trail. Derived fields are
refused by name: `cuid`, `kind`, `in`, `out`, `systemInstructionName`.

## Architecture — five layers

`input → intent → middle → output → evolution`

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

## Tabs are governed by law exactly as nodes are

**Read `_instructions/components.md`, `tab.md` and `tab.<name>.md` (when it exists) BEFORE changing a tab,
its entity or its `data`.** A component has no port table to refuse you, so an unread law here fails later
and quieter than a bad edge — not less badly.

A tab shows what an output node DELIVERED; it never computes the result. Add an entity rather than a second
tab of the same kind. Settings live in the core (`data`), not as prose in `info`.

## 🔒 Two surfaces are not yours to code

The **diagram** and the **use-cases panel** are PLATFORM views — one copy, identical in every account. You
own their DATA only: `graph.nodes` / `graph.edges` and `useCases.cases`, through `api/patch`. Coding either
inside this folder breaks reuse between accounts. If one looks wrong, write a `warning` and let the owner
decide.

Everything else — dashboard tables, calendar, map, control panel — is a PRODUCT SURFACE: you develop it, in
the `public/` half. The `admin/` half holds one thing only, the AI-request form.

## What a run leaves behind

- **Full text goes to the vector store; the database record holds a SUMMARY plus links.** That is why the
  project has two different stores.
- **Links have ONE representation** — `links: [{table,id}]`, mutual, written by the write itself
  (`addEntityRow` in `_lib/rows.ts`), never by the node. A row cannot be born unlinked.
- **Entity store vs run journal.** Entity stores (`database`, `vector-memory`, `storage`, `map`,
  `calendar`) write only when the run really creates something; journals (`history`, `analytics`, `toast`)
  always write. **Asking is not saving** — a question-class run leaves no record.

## Use cases

A case carries ONLY the distinctive: the subject area and this owner's scenario. Anything true of every
automation is LAW, never a case — test it by removing the description: if the behaviour still cannot be
violated, it is law. An incoming requirement lands on the cases first, then on the graph. A frozen template
ships with no cases at all.

## Four laws that are never bent

1. **A role is for life** — a node never changes its `kind` or `ioType`.
2. **Adding a channel is additive** — existing names are a public contract: extend, never rename.
3. **Input is pushed, never polled** — scheduled work exists for output.
4. **A secret is configuration, not code** — declare the env key, read it from the environment, write it
   through `api/env`.

## Shared tools

Before building a microphone, an image cropper, a map/route/geocoder or a terminal, read `tools-docs/`.
Wire the existing primitive; never copy it into this folder and never hand-roll a second one.

## Instructions you write

English and compact — the reader is a model that must also read the core. Prune before you append; never
restate what another instruction already says, link to it by name.

## Definition of done

`npm run check:core` green proves the core is LAWFUL — not that the automation WORKS. Done means a real run
with a real result you can show.
