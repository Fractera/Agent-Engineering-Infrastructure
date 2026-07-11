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
