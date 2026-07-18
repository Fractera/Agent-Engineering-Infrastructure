# ROUTE V3 — the self-sufficient automation route

The owner's architecture (dictated and agreed 2026-07-18, chat iterations 1→3; implemented by mega-step
254). This document is the AUTHORITATIVE map of what an automation route IS. The laws here bind the
frozen starter, every entity surface, the agent hand-off and the public surface. One canonical source per
document (law of step 253): where другие documents overlap, they point here.

## Why (the pain this kills)

Steps 250–253 proved the bottleneck is not the pipeline but TOKEN ECONOMY and SIGNAL/NOISE: the route
welded together the owner's admin cockpit (control plane) and the automation's actual behaviour (data
plane). An agent handed the folder paid ~80% of its tokens for admin machinery that never improves the
code, and weak models copied cockpit patterns into behaviour (the probe-250c dead-end node). V3 separates
the planes and hands the agent ONLY the essence.

## The eight laws

1. **The route is self-sufficient.** Everything the automation needs lives inside its folder; the only
   outside dependencies are the BASE LAYER: the UI kit, the style rules, the framework, and the platform
   entity-section machinery. Dependency arrows point INWARD only: the platform may import the route (the
   executor runs its nodes, the scanner reads its files) — the route imports nothing of the platform
   beyond the base layer. What is not a base-layer citizen is COPIED IN at birth; duplication across
   routes is the accepted price of autonomy.

2. **One entity pattern.** Every page entity (dashboard, controlpanel, activation, calendar, cron, map,
   processes, analytics, general, pages…) follows ONE shape: a `manifest` (id = the bundle entity id,
   order, default `presence`) + declarations. `presence` is a single enum — `"expanded" | "collapsed" |
   "hidden"` — never two booleans (no contradictory state can exist). The manifest carries the CODE
   default; the owner's runtime setting overrides it (two truths, two homes, never mixed). Adding an
   entity = copying the pattern + ONE registry line.

3. **view / admin / container.** Every entity separates its PUBLIC CORE (`view/` — the product surface a
   visitor sees; server-first, static-capable) from its ADMIN CHROME (`admin/` — pencils, quizzes,
   requirement panels; client-heavy allowed) with a container composing them by role/flags. The import
   law is one arrow: `admin/` may import `view/`; `view/` may NEVER import `admin/`. Admin chrome
   attaches only to points the view declares (manifest/stable ids) — decoration is convention-driven,
   mechanical, AI-free.

4. **The projection (the agent's sterile room).** Hand-off generates a clean production tree — the
   route's ESSENCE (~3–6k tokens: the six born documents, `_data`, entity manifests, `_nodes`, `_lib`,
   `_types`, `api/`, `pages/`) — into a neutral workspace OUTSIDE the served trees. The return is NOT a
   merge: it is a diff APPLIED through gates (path whitelist, node compilation, wiring rules), atomically.
   No file ever has two authored copies: each path has exactly one owner.

5. **Parallel routing, never files in the slot.** The shell (:3000) is the swappable guest — it carries
   ZERO project files (step 197's proven isolation). `/projects*` on the shell's domain is PROXIED to the
   projects runtime; the public surface is the view-composition of this same runtime behind that routing.
   The agent's room is not the served tree.

6. **One API per automation — the single runtime door.** The route's own `api/` (inside the folder,
   served by the app router) is called by BOTH surfaces: the owner's cockpit and the public page. Design
   (AI building nodes) happens only on the admin plane; ACTIVATION (a visitor asking "how much is Apple
   stock") goes through this same `api/`. The node executor stays platform-side and singular — the route
   ships behaviour sources, never a second runtime.

7. **App pages live without a rebuild.** The `pages/` entity holds owner-commissioned custom React pages
   (beautiful dashboards, custom interfaces) built by the agent under a DEPENDENCY CONTRACT (react + the
   UI kit + `../api` — a foreign import is a compile ERROR with a teaching message). Each page compiles to
   `page.compiled.mjs` (the step-249 light-loop pattern extended from functions to UI); a generic HOST
   route dynamic-imports the artifact (mtime cache-bust) — the page is live the moment it compiles.
   Styling: UI-kit components only (Tailwind purges arbitrary classes — the kit is what is guaranteed
   styled). The artifact is runtime truth: NEVER delete or hand-edit it.

8. **The born document set.** Every automation is born with six documents at its root: `AGENTS.md` +
   `CLAUDE.md` (the canon: who you are, the boundary, the contracts) · `WIRING-RULES.md` (nodes & edges
   reasoning) · `SCALE-RULES.md` (the decomposition law) · `PLATFORM.md` (the distilled platform map —
   lifecycle, the API, closing; so the agent NEVER reads the project root) · `README.md` (the owner's
   description). One source module each; pointers elsewhere.

## The route tree

```
app/(projects)/projects/<category>/<slug>/
│
│── AGENTS.md · CLAUDE.md · WIRING-RULES.md · SCALE-RULES.md · PLATFORM.md · README.md
│
│── page.tsx                  ← the frame only: header + <EntitySections/>
│── _entities/                ← ONE folder per entity — declarations, not machinery:
│   ├── registry.ts           ←   one line per entity (the only registration point)
│   └── <entity-id>/
│       ├── manifest.ts       ←   id · order · default presence (enum)
│       └── …declarations     ←   the entity's data (table config, calendar config, …)
│
│── _data/                    ← description · activation · channels · tests · use-cases · diagram (generated)
│── _nodes/<slug>/            ← meta.ts · functions.ts · instruction.ts · functions.compiled.mjs
│── _lib/                     ← the automation's OWN helpers (copied in, never referenced out)
│── _types/                   ← ALL types incl. its own copies of node-contract / channels / table-config
│
│── api/                      ← the single runtime door (route handlers, served in-place):
│   ├── run/route.ts          ←   activation (public console AND cockpit launch panel)
│   ├── rows/route.ts         ←   table reads for both surfaces
│   └── cron-tick/route.ts
│── cron.json
│
└── pages/                    ← the app-pages entity:
    ├── manifest.ts
    └── <page-slug>/
        ├── page.tsx          ←   agent's source under the dependency contract
        ├── page.compiled.mjs ←   the living artifact (no rebuild)
        └── spec.md           ←   the owner's requirement (while a draft)
```

The BASE LAYER (the only thing a route may import): `@/components/ui` (the UI kit), the style system,
the framework, and the platform `entity-section` machinery (the accordion frame + registry contract) —
the cockpit shell that renders any route's entity declarations uniformly.

## 🔒 The architecture lock (owner's hard requirement, 2026-07-18)

Every file of the entity pattern (view/ · admin/ · container · the entity-section machinery) carries this
lock as its header block, and it binds EVERY editor — human or AI:

> Changing the architecture in a way that breaks the chain is FORBIDDEN: view/ never imports admin/ or
> another entity; admin/ attaches only through the view's declared bridge points; the container is the
> only composition place; presence stays one enum; the section frame stays singular. The gates
> (`check:entity-imports` and friends) enforce these laws — WEAKENING A GATE TO MAKE A CHANGE PASS IS
> ITSELF THE VIOLATION. If a task seems to require breaking a law, stop and escalate to the owner —
> never "adapt" the architecture silently.

## Gates (each artifact has its own — "compiles ≠ works", step 251)

- `check:entity-imports` — the one-arrow law (`view/` importing `admin/` fails the build).
- The birth self-sufficiency gate — a born route greps clean of `_shared`/`@/lib` imports beyond the
  declared base layer.
- The projection-apply gates — path whitelist, node compile, wiring check; refusals TEACH (they name
  what was violated and what is allowed).
- The page compile gate — the dependency contract; a foreign import fails with a teaching message.
```
