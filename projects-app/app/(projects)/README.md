# Projects zone — how to add a new CATEGORY

Read this file before creating a category. It is the single, authoritative walkthrough — do not
improvise a different shape. (For creating a **project** inside an existing category, see the
category's own `README.md`, e.g. `projects/other/README.md` — that is a different operation and
uses the frozen automation starter, not this file.)

## What a "category" is

The Projects layer (§3.12) has a fixed set of top-level folders under `app/(projects)/projects/`.
Each one is a **category hub page** (`/projects/<category>`) that lists the projects inside it.
Categories are **permanent and always visible**, even with zero projects inside — `other` proves
this: it exists purely as the catch-all and today holds no projects, only its own hub files.

Header and footer are **never part of a category's files** — both come from the zone layout
(`app/(projects)/layout.tsx`, steps 186.1/213) automatically. A category folder never renders its
own chrome.

## When to reach for this file

**Worked example.** The owner says: *"create me a new category for automations, call it 'training'
— I don't want to keep dumping training projects into `other`."* This is a request for a **new
category**, not a new project. Do the following, in order.

## Step 1 — pick the slug

Kebab-case, English, one word if possible (e.g. `training`). This slug is permanent — categories
are never renamed (mirrors the project-slug rule, §3.12).

## Step 2 — add ONE entry to the single source of truth

Categories are **data**, not scattered code. Everything that lists categories — the hub nav, the
`/projects` index, the account-drawer manifest, the frozen-project-starter's category validator —
reads the same array. Edit exactly one file:

`app/(projects)/projects/_shared/categories.ts`

1. Add the new slug to the `ProjectCategorySlug` union.
2. Add one object to the `PROJECT_CATEGORIES` array. **Insert it BEFORE the `other` entry** —
   `other` must always render last (it is the catch-all; every other category is a deliberate,
   named home). Order in the array = render order everywhere.

```ts
export type ProjectCategorySlug =
  | "automation"
  | "fractera-pages"
  | "personal"
  | "training"   // ← new slug added to the union
  | "other";

export const PROJECT_CATEGORIES: ProjectCategory[] = [
  { slug: "automation", title: "Automation", navLabel: "Business", description: "…" },
  { slug: "personal", title: "Personal effectiveness", navLabel: "Personal", description: "…" },
  { slug: "fractera-pages", title: "Fractera pages", navLabel: "Fractera pages", description: "…" },
  {
    slug: "training",
    title: "Training",
    navLabel: "Training",
    description: "One line explaining what kind of project belongs here.",
  },                 // ← new entry, inserted BEFORE "other"
  { slug: "other", title: "Other", navLabel: "Other", description: "…" },
];
```

Nothing else needs editing — `category-hub.server.tsx`, `projects-index.server.tsx`,
`projects-manifest.ts` and `frozen-project-starter.ts`'s category validator all iterate this same
array, so the new category appears in the nav and the `/projects` index the moment this file
changes and the app rebuilds. (This single-array design exists on purpose: a second, hand-kept
list of category slugs is exactly the kind of two-sources-of-truth drift that broke
`telegram-notes-clone` in steps 210-212 — never duplicate this list anywhere.)

## Step 3 — create the category's own 4 files

Create `app/(projects)/projects/<slug>/` with **exactly these files**, copied from `other/` (today's
empty reference category) and substituting the slug/title. Do not invent extra files — a category
hub is deliberately this thin.

### `page.tsx`
```tsx
import TrainingCategoryEntry from "./_components";

// Thin server entry — see app/CRUD-DOCS/workspace-standards/shell-component-architecture.md.
export default function Page() {
  return <TrainingCategoryEntry />;
}
```

### `_components/index.tsx`
```tsx
import { CategoryHub } from "../../_shared/category-hub.server";

export default function TrainingCategoryEntry() {
  return <CategoryHub slug="training" />;
}
```

### `_meta.ts`
Copy `other/_meta.ts` verbatim and substitute exactly four values: `path`, `filePath`,
`description`, and the `training` occurrences in `relatedRoutes`/`notes` — every other field
(`visibility`, `roles`, `rendering`, `seo`, …) stays byte-identical, it is the standard category
descriptor.

### `README.md`
Copy `other/README.md` verbatim, substituting only the category name in the first line. This is
what makes a project created inside the new category start correctly (see that file for why).

## Step 4 — build and verify

Rebuild `projects-app` and reload `fractera-projects` (or call the deploy route with
`target=projects`). Then confirm:
- `/projects/<slug>` returns 200 and shows the standard header + footer + the (empty) category hub.
- The new category's nav button appears on every hub page, positioned right before `Other`.
- `/projects` (the root index) lists the new category with its live project count (0).

## Category vs. project — do not confuse the two operations

| | Category | Project |
|---|---|---|
| What | A permanent top-level folder (`/projects/<category>`) | A named folder inside a category (`/projects/<category>/<slug>`) |
| How many | A handful, added rarely, by hand (this file) | Many, created constantly |
| How to create | Follow this file | **Never hand-write files.** Call the frozen automation starter — see the category's own `README.md` (e.g. `projects/other/README.md`) or `POST /api/projects/create` |

## The project CARD standard (one format, every project, no exceptions)

Every project shows up on its category hub as a **card** — the "button" a visitor clicks to open
it. That card is not hand-styled per project: `_shared/project-card.ts` reads it from ONE thing —
a hidden HTML comment in the project's `README.md`:

```
<!-- fractera:project
{"kind":"project","category":"<cat>","slug":"<slug>","title":"<Title>",
 "project":{"title":"<Title>","purpose":"<one sentence — becomes the card's description line>"},
 "interface":{"inputs":[...],"outputs":[...]},
 "nodes":[{"tools":["..."]}, ...]}
-->
```

No block → the card falls back to a bare, blank-looking title with no description and no badges
(`project-card.ts`'s `fallback`) — **this is the exact bug this session found**: a project created
without this block renders an "empty button." There is only ONE correct fix — emit a valid block —
never style around a missing one.

- `title` / `project.purpose` → the card's title line and description line.
- `interface.inputs[].type` + `interface.outputs[].type` + `nodes[].tools[]` → the badge row
  (de-duplicated, capped, "+N" overflow). An empty array here is fine and expected — it just means
  no badges show; it is NOT the same as a missing block.
- This is the **same block**, same shape, whether it is:
  - **hand-authored minimal** (the frozen starter's v1 skeleton writes an honest one — see
    `_lib/frozen-project-starter.ts`'s `README.md` entry — `purpose: "Not yet decomposed…"`,
    empty `interface`/`nodes`), or
  - **engine-generated rich** (`orchestrate-project-by-steps` writes the full graph — actions,
    state, every node with its real tools/io — once the project is properly decomposed; see
    `projects/personal/telegram-notes/README.md` for the reference).

  One format, growing richer over the project's life — never a second, competing format. If you
  ever touch a project's README, keep this block valid; if you add fields the engine emits that
  `project-card.ts` doesn't yet read, extend the reader, don't invent a parallel block.

## The settings & tests declaration standard

> This section is the frozen instruction for how a project declares its **Settings** and its
> **Tests**. It is written down here first, as-is, before the code follows it — treat the README as
> the spec. Both surfaces are **declaration-driven**: nothing about a specific channel or a specific
> test is hand-coded inside a component. A project declares *what* it has in `_data/`; the frozen
> shared components render and run it. This is what makes the pattern scale — a new automation gets
> Settings and Tests for free by writing data, not UI.

**Where declarations live.** In the project's `_data/` — never in `_meta.ts`. `_meta.ts` is the
`RouteMeta` descriptor: a fixed, universal standard where *every route* (including `/dashboard`)
carries *every* key. Automation-specific fields would break that contract, so they never go there.

### 1. Input channels — `_data/channels.ts` (type from `_shared/channels.ts`)

A channel is how the automation is fed or connected: Telegram, OpenAI, Google Calendar. A
**connector is just an input channel** — there is no separate "connector" concept; connecting one is
recorded here like any other channel. The Settings modal renders the channel list straight from
`INPUT_CHANNELS`.

```ts
export type ChannelKey = {
  env: string;        // the runtime env key, e.g. "TELEGRAM_BOT_TOKEN"
  label: string;      // WHAT it is, in plain words: "Bot token"
  help?: string;      // WHERE to get it: "Message @BotFather → /newbot → copy the token"
  optional?: boolean; // an empty value is a legitimate default, not a missing key
  secret?: boolean;   // masked input; the value is never echoed back
};

export type InputChannel = {
  name: string;         // the channel as a human names it: "Telegram", "Google Calendar"
  description: string;  // one line: what this automation receives (or publishes) through it
  keys: ChannelKey[];   // every key needed to connect it; several is normal (Google Calendar = 2)
};
```

`description` is the per-channel explanation; `help` is the per-field "where do I get this"
explanation. Both are declared once, in data — so the Settings UI can show a scalable, self-
explaining form without a single hard-coded hint. Required env keys are derived from the channels
(`requiredEnvKeys()` in `_shared/channels.ts`) — one source of truth, no parallel `required-keys`
list.

### 2. Tests — `_data/tests.ts` (type from `_shared/tests.ts`)

Every probe is declared **explicitly**, one per entity the automation touches, across three stages:
`input`, `intermediate`, `output`. Each probe carries its own **prepared** success / error text —
the test route only reports whether it passed; the component shows the declared text. There is **no
free-form / "custom" test** — that shape does not scale and is removed.

```ts
export type ProbeKind = "openai" | "telegram" | "lightrag" | "google-calendar"; // frozen shared kinds
export type ProbeStage = "input" | "intermediate" | "output";

export type ProbeBinding =
  | { type: "shared"; kind: ProbeKind }                    // → the frozen shared route /api/projects/tests/[kind]
  | { type: "project"; route: string; method?: "GET" | "POST"; body?: Record<string, unknown> };

export type Probe = {
  id: string;
  label: string;        // card title
  hint: string;         // card subtitle
  stage: ProbeStage;
  binding: ProbeBinding;
  successText: string;  // prepared, shown when the route reports ok
  errorText: string;    // prepared, shown when it fails
};
```

**Test route contract (both shared and project routes):** the endpoint answers
`{ ok: boolean; detail?: string }` (`detail` is for debugging only; the user-facing text comes from
the declaration). A `type: "project"` binding with `method: "GET"` may treat any HTTP 2xx as `ok`.

**Two layers of test routes.**
- **Typed / shared probes** (check the OpenAI key, reach the Telegram bot, ping vector memory, check
  a connector's OAuth) depend on the *channel type*, not the project. Their route lives **once** in
  the frozen layer and is reused by every project that declares a probe of that kind.
- **Project-specific probes** (e.g. "records for THIS project save to the database") live in the
  project's own API folder, but obey the exact same `{ ok, detail }` contract.

**The tests folder — naming gotcha.** A served route folder must **not** be called `_tests`: Next.js
treats `_`-prefixed folders as private and does not route them (and `_shared/projects-manifest.ts`
skips them). So the shared test routes live at `app/api/projects/tests/[kind]/` (served — one
dynamic route over all frozen kinds), while non-routed declaration registries live under `_shared/`.

### 3. Where these surface in the UI

The project menu (`automation-info-menu.client.tsx`) stays automation-agnostic by contract. After
the **Automation** section it gains: a separator → **Settings** (opens a 600×600 modal of accordions:
AI model, run interval, input channels) → a separator → **Tests** (opens a modal of probe cards).
The AI-model accordion needs the projects layer to serve its own self-sufficient
`/api/openai-models` (it does not today — the model picker silently degrades to a text box until it
exists); adding it is part of the implementation that follows this spec.

### Iterate here first

This standard is captured as-is so we can refine it *in the README* — add, remove, or change a rule —
before any component or route is built. Once it settles, the frozen shared components, the shared
`app/api/projects/tests/[kind]/` route, the `telegram-notes` reference, and the frozen starter (so
new projects are born with these modals and honest empty states) all follow from exactly what is
written above. When the starter emits it, this section is mirrored into the project's own `README.md`
the same way the CARD standard is.
