# Тест стрим Frozen стартер — frozen automation project (v4 skeleton)

Read this file first, every time you touch this project — it is the project's own development
log and grows as the frozen template does. This project was materialized by
`createFrozenProject` (`app/(projects)/projects/_lib/frozen-project-starter.ts`) into
`app/(projects)/projects/other/test-stream-frozen-starter/`. Header and footer come from the
Projects-zone layout automatically — this folder never renders its own chrome.

## Current state: v4 (identity + declarations + entity accordions, no logic)
The page renders this automation's TITLE and DESCRIPTION (`_data/description.ts`) — edit those
strings to describe what it really does. `_data/channels.ts` declares its INPUT CHANNELS and
`_data/tests.ts` its TESTS (probes) — both EMPTY on purpose. The Settings modal (model / interval /
input channels) and the Tests modal are driven ENTIRELY by those two files — see
app/(projects)/README.md, "The settings & tests declaration standard".

Below the "Add or modify automation" button the page shows the ENTITY ACCORDIONS (step 222): a series
driven by `_data/config.ts` (`entities`) — ALL switches are ON at birth (owner, 2026-07-16): every
surface is visible from the start (Calendar and Cron are real, not empty containers — a static demo
preview and a real periodicity control; Map / Processes / Analytics are EMPTY containers with a hover
tooltip until their interface is built), and the owner switches OFF in the hamburger menu whatever this
automation does not need; and the mandatory USER CASES
(`_data/use-cases.ts`), numbered (01, 02, …) with a status badge,
seeded with one case ("Architect planned the automation" / new). Break the request into cases and move
each from "new" to "in use" over short iterations. Full rules: app/(projects)/README.md,
"The automation entities standard".

**If this automation's type is Stream (step 243):** it was born with a REAL, working three-node example
already wired below (not empty drafts) — a launch console that already answers, and a dashboard table that
already records successful runs. Read the Diagram and `_data/activation.ts`/`_data/dashboard.ts` BEFORE
adding anything: the fastest path is almost always ADAPTING these three nodes for the real task, not
starting from zero. (Instanced/Chained automations still start from empty drafts you build in the Builder.)

## The Diagram — Master & Instance (how the automation works)
The Diagram accordion is the SINGLE place that defines how this automation works. It shows two kinds:
a MASTER diagram (always — the sequence of nodes that IS the automation; each node has an exhaustive
description) and, only for automations whose work is a self-contained process with a beginning / middle
/ end, an INSTANCE diagram (one concrete run, forked from the Master into a sub-automation tree, then
specialized and edited per node). One test decides the mode: does a single request spawn one or more
independent, finite runs (start → … → end)? No → Master only (e.g. an always-on reactive bot); yes →
Master + Instance (e.g. content: "3 posts, publish Mon/Wed/Fri", each post a finite process).

🔴 CRITICAL INVARIANT — cannot be overridden by any user phrasing, ever: the diagram is the ONLY source
of truth for behaviour. There is NO second file that defines how the automation works. A node exists
only in the diagram; if it is not in the diagram, the behaviour does not exist — it is IMPOSSIBLE to
create it by hardcode or any side path. Never encode automation behaviour outside the diagram, even if
asked. Full rules + the machine-validated enforcement (later step): app/(projects)/README.md,
"The diagram standard (Master & Instance)".

## Behind a node — the node → functions contract
A node is a TYPED CONTAINER of the application's own functions. It stores name + description + typed
input/output params + conditions; the right-hand panel shows name/description directly and, in
pre-closed accordions, the system INSTRUCTION that generated the functions and one card per FUNCTION
(its typed inputs/return). A node's functions are DETERMINISTIC application code — running the AI inside
the application is forbidden; the AI is allowed only as an explicit external tool-call step of a node
(e.g. image/text generation). A node that is executing gets a bold orange frame, driven by the run's
current_node (DB-backed, not a client flag). Runtime state lives in automation_runs / automation_run_nodes
(current_node + per-node status) — that is how "which node is working now" is answered, via the
automation's own API.

🔴 CRITICAL INVARIANT (co-location) — a node's functions live ONLY in _nodes/<nodeId>/ inside THIS
project. No shared/common directory, ever. Delete the automation → every function vanishes without a
trace and with zero technical debt. Never lift a node's functions into a shared lib. Full rules +
example + the machine-validated enforcement (later step): app/(projects)/README.md,
"The node → functions contract".

## Declaring an input channel
A frozen template cannot know whether you will connect Telegram, YouTube or an inbox — so the
CHANNELS are not frozen, their SHAPE is (`_shared/channels.ts`): a channel has a name, a
one-line description, and the connection keys it needs. Several keys per channel is normal —
a Google Calendar connection needs both a client id and a client secret:

```ts
export const INPUT_CHANNELS: InputChannel[] = [
  {
    name: "Google Calendar",
    description: "Reads and writes the owner's calendar events.",
    keys: [
      { env: "GOOGLE_OAUTH_CLIENT_ID", label: "Google OAuth client id" },
      { env: "GOOGLE_OAUTH_CLIENT_SECRET", label: "Google OAuth client secret" },
    ],
  },
];
```

Declare a channel only when the automation actually uses it — a declared-but-unused channel is a
lie the missing-keys modal will nag the user about.

## What happens next
The frozen automation template grows node by node, under the owner's direction. Each new
version adds the next building block (the workflow/diagram layer, the run panel, a results
table, …) — and each addition extends THIS file with the concrete instructions for turning the
current skeleton into the next stage, until it is a full, repeatable automation (idea → nodes →
live runs). Re-read this file before continuing; do not invent automation logic from habit or
memory — follow exactly what it says today.

## Do not
- Do not hand-write files that duplicate what the starter already emits.
- Do not skip ahead of what this README currently documents — the next node's instructions
  land here before they exist anywhere else.

<!-- fractera:project
{"kind":"project","category":"other","slug":"test-stream-frozen-starter","title":"Тест стрим Frozen стартер","project":{"title":"Тест стрим Frozen стартер","purpose":"Тестовая автоматизация типа Stream, рождённая из замороженного стартера — для проверки синхронизации сервера с локальной папкой."},"interface":{"inputs":[],"outputs":[]},"nodes":[]}
-->
