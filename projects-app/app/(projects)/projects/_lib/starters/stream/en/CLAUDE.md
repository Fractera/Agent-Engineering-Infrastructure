# CLAUDE.md

**The entry point for this automation is [`AGENTS.md`](AGENTS.md). Read it now, then
[`_instructions/passport.md`](_instructions/passport.md).**

This file is a pointer, not a second copy. Two entry documents with the same content drift apart, and
then neither can be trusted — one fact, one home (the folder's law 2). Claude Code opens `CLAUDE.md`
automatically, so this file exists to send you one file onward.

The four things worth carrying before you get there:

1. **Read only the RUNTIME layer** — the core (`_data/`), node functions (`_lib/nodes/`), the public
   components (`_components/<tab>/public`) and their runtime functions (`_lib/components/`). Read it
   freely — nothing is hidden behind an API. **SKIP the dev-slots** (`_components/shared/dev-slot*`): thin
   files that only dynamically import external dev tools from `_shared-v2` behind a fail-silent boundary —
   not this automation's substance, they teach nothing about it (AGENTS.md §0, resilience law).
2. **Never hand-edit `_data/automation.json` without checking it.** Change it through `POST api/patch`
   (validates the whole core before writing, refuses in words), or edit and then run
   `npm run check:core`. Editing without checking is the one habit that breaks this project quietly.
3. **A role is for life, adding a channel is additive, input is pushed never polled, a secret is
   configuration never code.** These four are never bent.
3a. **🔒 The DIAGRAM and the USE CASES are not yours to code.** Their rendering is a PLATFORM view that
   lives once in `_shared-v2/components/{diagram,use-cases}` and is identical in every account. You change
   only their DATA in the core — `graph.nodes`/`graph.edges` and `useCases.cases`, through `api/patch` —
   and never reimplement the canvas, the cases panel or the Quiz inside this folder. Coding them is outside
   your competence and would break reuse of this automation between accounts (AGENTS.md §0a).
4. **Green `check:core` is not proof that the automation works** — it proves the core is lawful. Proof
   is a real run with a real result.
5. **Reusable tools already exist outside your folder — wire them, don't rebuild.** An image cropper, a
   voice-input mic and more live in `_shared-v2/tools/`. Before building such an affordance, read
   [`tools-docs/`](tools-docs/) (one short reference per tool: call, params, return, constraints). Wire the
   existing one; never copy it into this folder (AGENTS.md §0b).
6. **The middle is a LIBRARY of node skills — reveal one before writing one, and never say "cannot".** A
   middle need is met one of three ways: a skill from `middleLibrary` (in the `GET api/core` digest) → own
   code in `_lib/nodes/` → `capability: needed` + a warning to the owner. There is no fourth outcome —
   «this automation cannot do it» does not exist (AGENTS.md §0d, `_instructions/nodes.md`).
