# COMPONENTS — everything the owner SEES, tab by tab

The graph does the work; the components show it. A result the graph produces and no component shows
has not been delivered. Node work and component work go hand in hand — finish a round with both.

## What you build, and what you wait to be asked for

- BUILD WITHOUT BEING ASKED, always: the CONTROL PANEL — the default way the owner sends work into
  this automation — and the DASHBOARD, which carries at least one page. Everything the automation
  records has to be visible somewhere from the first day.
- EVERYTHING ELSE WAITS FOR AN EXPLICIT REQUEST. A calendar, an analytics, a map, a public page exist
  because the owner asked for them, not because the automation could have one.
- A TAB IS A KIND, AN ENTITY IS ONE CONCRETE THING OF THAT KIND: one calendar tab may hold two
  calendars. Need a second calendar? Add an ENTITY to the existing tab — never a second calendar tab.
- `name` must match a folder in `_components/`; that is how the page finds the tab's code.

## What you actually write — the HARD runtime layer

The components you build are the RUNTIME (public) layer — what the END USER sees after development is
over. They belong to the hard side of the resilience law "production hard, development soft": they live
inside this folder and are self-contained, so the folder runs unchanged in any other account and ships as
a ZIP. A component is a PURE REACT COMPONENT and nothing more exotic; it is compiled the moment you save
it and is on the page immediately — on the owner's cockpit and on the public mirror alike. Your flow needs
no build step for a runtime component: if a change is not visible, it did not compile — read the error and
fix it, don't ask anyone to restart anything.

The contract that makes that possible:

- ONE DEFAULT EXPORT, an async server component: `export default async function Calendar() { … }`.
- PLAIN JSX. The runtime is bundled in for you; you do not import React.
- REACH NOTHING OUTSIDE THIS FOLDER — with two named exceptions. A runtime/public component imports its
  own folder (its siblings, `_lib/`, `_data/`) plus `zod`, plus **the shadcn stack** (step 298, decision A):
  the primitives `@/components/ui/*`, the `cn` helper `@/lib/utils`, and the bare packages the stack rides on
  (`lucide-react`, `sonner`, `class-variance-authority`, `clsx`, `tailwind-merge`, `@radix-ui/*`). It never
  imports another automation, any OTHER platform module, the v1 `_shared`, or the soft dev layer `_shared-v2`.
  A foreign import beyond those becomes a dependency nobody owns tomorrow and breaks self-containment.
  (`scripts/check-entity-imports.mjs` enforces this: the lawful outside paths are the shadcn stack and
  `_shared-v2` — the latter ONLY from the dev-slot files, never from a public component.)
- DATA COMES FROM THIS AUTOMATION'S OWN DOORS, fetched by their address — never from another
  automation, never from a platform module.
- STYLING AND UI ELEMENTS ARE shadcn — MANDATORY (step 298). Hand-rolled UI elements (a custom `<button>`,
  a bespoke dialog, an ad-hoc select) are FORBIDDEN; reach for the shadcn primitive instead. The only excuse
  is a case shadcn genuinely cannot express — and then say so in a warning, never quietly hand-roll. Meet a
  hand-written element from an earlier step? Rewrite it to shadcn on sight. Compose with `cn` + Tailwind.

The SOFT layer — the "Build with AI" buttons and the admin settings — is not yours: it lives outside in
`_shared-v2` and is wired in through the fail-silent dev-slot (`_components/shared/dev-slot*`). Production
never depends on it: remove `_shared-v2` and those dev affordances simply stop appearing while every
runtime component keeps working. You do not build or study that layer (AGENTS.md §0).

Everything you cannot express under this contract is a signal, not an obstacle: say so in a warning
rather than reaching outside the folder.

## 🔒 TWO SURFACES YOU DO NOT CODE — the diagram and the use cases

The DIAGRAM (the canvas) and the USE-CASES panel are **platform views derived from the core**, not features
of this automation. Their single copy lives in the development layer (`_shared-v2/components/{diagram,
use-cases}`) and is identical for every automation in every account. **Coding them is outside your
competence and is forbidden** (AGENTS.md §0a).

You own their DATA and nothing else: `graph.nodes` / `graph.edges` and `useCases.cases`, changed through
`api/patch`. Change the data — the view follows, everywhere, unchanged. Never reimplement the canvas, the
cases panel or the Quiz inside this folder; if one looks wrong, raise a `warning` instead.

## Which half a thing belongs in — the "Build with AI" test (owner, 2026-07-24)

Ask ONE question about the object: **does it have a "Build with AI" request form?**

- **NO → PLATFORM VIEW** (diagram, use cases). Nobody designs it with AI; its code lives once in
  `_shared-v2`, and you never touch it. You change only its DATA in the core.
- **YES → PRODUCT SURFACE** (dashboard tables, calendar, map, control panel, and everything of that kind).
  The owner sends briefs about it, and YOU implement them by editing files in THIS folder. Therefore its
  WHOLE LOGIC lives in `<tab>/public/` — the half you may develop — and `<tab>/admin/` holds ONLY the
  AI-request form, nothing else.

Putting a product surface's logic into `_shared-v2` breaks the automation: the layer is closed to you, so
the brief "put a video in that column" becomes impossible, and every automation would be stuck with the
same table instead of its own.

## The tab-folder standard — the SAME shape everywhere (step 298)

Every tab/section folder under `_components/` has ONE shape, identical everywhere (models: `calendar/`,
`dashboard/`). `npm run check:tab-structure` enforces it.

- `<tab>/index.tsx` — the **composition**, never a switch: the public half on top (everyone sees), the
  admin half below (wrapped in `<DevSlot>`, `surface === "admin"` only).
- `<tab>/public/` — the **runtime/public** half: read-only, works without `_shared-v2` (law 0 + shadcn).
  One file per entity + `public/components/` for shared parts.
- `<tab>/admin/` — the **admin** half: the settings shown to the owner + `admin/components/`. This is the
  half tied to the administrative surface; the dev-slot mount (`shared/dev-slot` → `_shared-v2`) is composed
  here or in the tab's own `index.tsx` — NEVER in the automation's top-level `_components/index.tsx`, which
  only CALLS `<Tab/>`. Its counterpart in the dev layer is a microservice `_shared-v2/components/<feature>/`
  with `client | server | types`.

A section that lives outside the tab row (like `use-cases`) still carries the same triple.

## Where the components appear

- THE OWNER'S COCKPIT — `projects.<domain>/projects/<category>/<slug>` (port 3003 when there is no
  domain): the development surface, after authorisation, architect and manager by default.
- THE PUBLIC MIRROR — `<domain>/projects/<category>/<slug>` (port 3000 without a domain): what a
  visitor sees. What is visible there is decided by role and by the page component's own settings.
(A third placement — inside a parallel route of the public site — belongs to Fractera Pro, which has
no interface yet: see `fracteraPro`. Until it exists, there are two surfaces, not three.)

The same tab therefore has two audiences. Never show on the public mirror what only the owner should
see: keys, raw payloads, internal identifiers, anything a `warning` says.

## Closing component work

Each tab and each entity carries the same record as a node: `info` (the owner's brief, then your
account), `status`, `warnings`, `envKeys`. Close them one by one, exactly like nodes — build it,
replace the brief with your summary, set `materialized`. Blocked means a warning, not a guess.
