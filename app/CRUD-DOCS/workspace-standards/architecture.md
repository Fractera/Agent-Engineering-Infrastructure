# Architecture page — standard

The **/architecture** page is the live map of everything this app serves — its pages and
endpoints, grouped into three streams: **projects · pages · endpoints**. Like the other
filesystem pages (`/glossary`, `/development-steps`, `/patterns`) it is **filesystem-backed —
there is no database**. An agent reads and writes the same files the page does.

The page is admin-only (a service page) and dynamically rendered.

## Two files per route — the key distinction

Every route is described by **two separate files**, with different jobs. Do not confuse them.

| File | Role | Who writes it | In the panel |
|---|---|---|---|
| `app/app/<path>/_meta.ts` | **Static descriptor** — the route's standard `RouteMeta` facts (roles, rendering, visibility, SEO, composition …). "What the route IS." | We / an agent, in code | Read-only (the collapsible accordion) |
| `app/app/<path>/README.md` | **Living record** — the free-form to-do / wishes and deletion requests for this route. "What to DO with it." | **You, via the right panel** (and agents) | The editable To-do list + Danger zone |

**Your to-do is NOT stored in `_meta.ts`.** When you add a task in the right panel and press
**Save changes**, it is written to `app/app/<path>/README.md` — the file an agent actually reads
to pick up the work. `_meta.ts` is never touched by the to-do editor.

This mirrors the rest of the workspace: the README.md is to a route what GLOSSARY.md is to the
glossary and a step file is to development steps — a real file on disk as the single source of truth.

### `_meta.ts` — the descriptor

A typed `RouteMeta` (the standard lives in `lib/architecture/route-meta.ts`): one maximal superset
that describes any route — identity, access control (`visibility`, `roles`), routing shape,
rendering & caching, SEO, i18n, composition, knowledge. Every key is always present; "not
applicable" is expressed by value (`undefined` / `[]` / `null`), never by omission. The page shows
these fields read-only.

### `README.md` — the record

One README.md per route folder, with a human-readable body the agent reads plus a hidden machine
block that keeps the structured fields round-trippable (`lib/architecture/readme-file.ts`):

```markdown
# <title>

> Declared via the Architecture page. This README is the record an agent reads
> to pick up the work below and build / change / remove this page.

- **Path:** `/example`
- **Kind:** page

## To-do (for the agent)
- <task you added>

<!-- fractera:meta
{"title":"…","kind":"page","base":"/","dynamic":false,"query":[],"description":null,"tasks":[{"id":"…","kind":"todo","body":"…"}]}
-->
```

Tasks are read/written through `/api/project/default/architecture/tasks` (GET/POST) and
`…/tasks/[id]` (DELETE) — one write-path for both the UI and an agent (`X-Agent-Identity`).

## Declared vs live (the §3.11 loop)

The filesystem scan (`lib/architecture/fs-scan.ts`) is the source of truth for the tree:

- A folder with a **README.md but no built file** (`page.tsx` / `route.ts`) = a **declared**
  entity — a request nobody has built yet (orange label + `req` badge).
- A folder with a **built file** = **live**.

So the loop is: you **declare** a page from the architect (writes a README.md) → an agent reads the
README, opens a development step, builds the page (writes `page.tsx`) → the README is removed and the
node flips from declared to live. "Add page" / "Add endpoint" declare at any depth.

## The right panel

Selecting a node opens its panel: header (kind · status · path · `Open page`), the description, the
`_meta.ts` descriptor accordion (read-only), a **Source** viewer (the route's real code, read-only —
editing it records a code-change task, it does not execute), then the **To-do** list and the
**Danger zone** (Order deletion = a request for an agent to retire the route and refactor its uses;
not a destructive button).

**Service pages are locked.** The built-in admin service pages (tagged `service`) are workspace
control surfaces — their panel shows only the name + description + a "locked" note. They have no
editable settings, to-do or danger zone and cannot be changed or removed from this view.

## Live tree

A short poll (`…/architecture/signature`) diffs a per-path signature; only changed nodes blink and
auto-reveal, so when a background agent works you see exactly what changed. Selection and expanded
folders are preserved across polls.

## Where things live (summary)

| Thing | Location |
|---|---|
| Route descriptor | `app/app/<path>/_meta.ts` |
| Route to-do / wishes / deletion requests | `app/app/<path>/README.md` (machine block `fractera:meta`) |
| Tree source of truth | the filesystem scan of `app/app/**` (`fs-scan.ts`) |
| Task read/write API | `/api/project/default/architecture/tasks[/id]` |
| Declared-route registry | README.md presence (no DB) |
