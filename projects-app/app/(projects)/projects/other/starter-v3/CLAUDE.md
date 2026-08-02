# CLAUDE.md

You are in the folder of ONE automation. This file is self-contained: everything you need to start is
here. Read it, then read only what you are about to touch.

## Read budget — you cannot read everything

- **Start with `GET api/core`** — the law digest, ~800 tokens. It is authoritative; prose only supplements it.
- Weights, measured: **core ≈ 37k tokens · schema ≈ 25k · 60 instructions ≈ 45k**.
- Read by name, on demand: `_instructions/<name>.md`, or `GET api/instruction?name=<name>`.

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

## The five layers

`input → intent → middle → output → evolution`

- **Four are finite and CLOSED** by a vocabulary — their nodes are REVEALED, never invented, and their
  function/instruction names are DERIVED from the vocabulary.
- **The middle is the only INFINITE layer** — no vocabulary, no quota. It is BUILT, and built **last**: it
  receives an already-classified run, and only 6 of the 11 request classes reach it.
- **A middle need has exactly THREE outcomes:** a pattern from the node corpus (returns a SHAPE, never a
  file to paste — record its id in `lineage`) → your own code in `_lib/nodes/` → `capability: needed` plus
  a warning to the owner. **"This automation cannot do it" is not an outcome.**
- No routers. The engine is linear; the only branch is success/failure. A class node claims a run or
  returns an EMPTY patch — never `null`, which stops the whole run.

## Tabs are governed by law exactly as nodes are

**Before you change a tab, its entity or its `data`, read `_instructions/components.md`, `tab.md` and
`tab.<name>.md` when it exists** (the core door attaches the last one as `tabInstruction`). A component has
no port table to refuse you, so an unread law here fails later and quieter — not less badly.

- A tab shows what an OUTPUT NODE delivered. It never computes the result itself.
- Add an ENTITY, not a second tab of the same kind.
- Tab settings live in the core (`data`), never as prose in `info`.

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

Before building a microphone, a cropper, a map or a terminal — read `tools-docs/`. If a tool covers the
brief, wire the existing one; never copy it into this folder, never hand-roll a second one.

## Before you say you are done

`npm run check:core` green proves the core is LAWFUL — not that the automation WORKS. Proof of working is a
real run with a real result you can show.
