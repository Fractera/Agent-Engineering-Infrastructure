# Patterns & Anti-patterns — standard

A reuse library the AI consults while it builds, surfaced by the **/patterns** page.
Everything lives as **real markdown files on disk** — there is no database (the same
model as development steps, the architecture README files, and the glossary). An
agent reads and writes them; the page reads and writes the same files.

- A **pattern** is a proven, reusable piece of code (a button style, a whole
  section, a brandbook rule) the model reuses or extends instead of re-deriving it.
- An **anti-pattern** is a deployment pitfall the model reads **before it deploys**.
- A pattern is a skill's counterpart: a skill is *how the model thinks*; a pattern is
  *what it reuses*.

## Layout

```
PATTERNS/
  PATTERNS/        <category>/<NN>-<slug>.md   ← patterns, a one-level tree by category
  ANTI-PATTERNS/   <NN>-<slug>.md              ← anti-patterns, a flat list
```

- Seed categories: `ui-elements`, `sections`, `brandbook` (extended later as a
  separate step). A category is just a folder under `PATTERNS/PATTERNS/`.
- `<NN>` — a global number, zero-padded; `<slug>` — a few kebab-case words.

## File format

Each file is human-readable markdown plus a hidden machine block carrying the
structured fields:

```markdown
# Primary Button

> Pattern · UI Elements · stable

The standard primary call-to-action button — reuse it for every primary action.

## Source code example

```
<button className="… bg-primary …">{children}</button>
```

## Steps
_No tasks._

<!-- fractera:pattern
{"kind":"pattern","category":"ui-elements","number":1,"name":"Primary Button","status":"stable","description":"…","code":"<button …>{children}</button>","tasks":[]}
-->
```

Fields in the `fractera:pattern` block:

| Field | Meaning |
|---|---|
| `kind` | `pattern` or `anti`. |
| `category` | Category slug (patterns only; empty for anti-patterns). |
| `number` | Global number. |
| `name` | Short title (≤ 2 words by convention). |
| `status` | `declared` (requested, not filled in yet) or `stable`. |
| `description` | What the pattern is for (mirrors the body). |
| `code` | The reusable code example (the pattern's payload). |
| `tasks` | `[{ id, body, kind?, outcome? }]` — to-dos and deletion requests. |

The markdown body and the machine block must stay in sync. Editing through the
/patterns page keeps them in sync automatically; if you edit by hand, update both.

## The two stages (declared → stable)

You do **not** describe how a pattern should look. You **request** it; an agent fills
it in. This drives the tree colour (same model as /architecture):

- **declared** → orange title + `(req)` badge — a request nobody has built yet.
- **stable with an open task** → black title + `(req)` badge — built, but has pending
  work.
- **stable, no tasks** → plain black — settled.

`pending` (the `(req)` badge) is `true` whenever `status === "declared"` OR there is
any task. An agent flips `status` to `stable` once it has filled the pattern in.

## How an agent reads a deletion request

Deletion is **not** a command to wipe the file — it is a request the agent plans
(retire the pattern **and** refactor anywhere it is used). A "Order deletion" writes
a task with `"kind":"delete"`, the reason in `body`, and the expected end result in
`outcome`. The agent sees it two ways:

- **In the file** — a human-readable section:
  ```
  ## Deletion requests
  - <reason> → <expected outcome>
  ```
- **In the machine block** — `{"kind":"delete","body":"<reason>","outcome":"<result>"}`.

So an agent: reads `kind:"delete"` → retires the pattern, using `body` (why) and
`outcome` (the end state to achieve), and updates usages. A hard file delete exists
**only** for a `declared` draft (never built, nothing to refactor), via *Remove
declaration* behind a confirmation modal.

## Anti-patterns

Read the **Anti-patterns** list before every deploy. Each entry is the mistake plus
the guard that avoids it (its Source example is usually a one-line check). They are a
flat list — no categories.

## Live highlighting

The page polls the filesystem on a short interval (the bar at the top). When a
pattern is added or changed, only that node blinks (three pulses), its category
auto-expands, and it scrolls into view — so when a background agent works, you see
exactly what changed. Polling pauses while the tab is hidden.
