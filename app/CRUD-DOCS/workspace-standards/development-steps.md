# Development steps — standard

The project's work log lives as **real markdown files on disk**, surfaced by the
**/development-steps** page. There is no database — the files are the source of
truth (the same model as the architecture README files and the glossary). An agent
reads and writes them; the page reads and writes the same files.

## Layout

```
DEVELOPMENT-STEPS/
  NEW-STEPS/        <NN>-<slug>.md   ← open steps (editable)
  COMPLETED-STEPS/  <NN>-<slug>.md   ← finished steps (read-only history)
```

- `<NN>` — the step's global number, zero-padded (e.g. `07`). Numbers are unique
  across both folders and a step keeps its number when completed.
- `<slug>` — a few kebab-case words from the name.

## File format

Each step file is human-readable markdown plus a hidden machine block that carries
the structured fields:

```markdown
# 07 — Add Telegram reminder ingestion

> Development step · importance: mandatory

Pull the owner's Telegram messages into the vector store so they can later ask
what they had planned. Out of scope: the reminder UI.

## To-do
- Wire the gateway webhook
- Embed and store each message

<!-- fractera:step
{"number":7,"name":"Add Telegram reminder ingestion","importance":"mandatory","status":"new","completedAt":null,"description":"Pull the owner's Telegram messages …","tasks":[{"id":"<uuid>","body":"Wire the gateway webhook"},{"id":"<uuid>","body":"Embed and store each message"}]}
-->
```

Fields in the `fractera:step` block:

| Field | Meaning |
|---|---|
| `number` | Global step number. |
| `name` | Short title. |
| `importance` | `optional` (gray) · `mandatory` (amber) · `critical` (red). |
| `status` | `new` or `completed`. |
| `completedAt` | `null` while new; `YYYY-MM-DD` once completed. |
| `description` | The full task text (mirrors the markdown body). |
| `tasks` | Sub-tasks `[{ id, body }]` (mirrors the To-do list). |

The markdown body and the machine block must stay in sync. Editing through the
/development-steps page keeps them in sync automatically; if you edit the file by
hand, update both.

## How a step is created

- **In the page:** New steps → *Add step* (name + importance). The file is written
  to `NEW-STEPS/` with the next number.
- **Recommended:** let the chat or MCP draft the task for you; you can also command
  the coding agents (Claude Code, Codex, …) directly. However it starts, the task
  appears first under **New steps**.

New steps are directly editable any time — importance, description, raw Source, and
the To-do list all save the file at once.

## How a step is completed

Completion is done by the agent / on the filesystem (there is no complete button in
the UI):

1. Move the file `NEW-STEPS/<NN>-<slug>.md` → `COMPLETED-STEPS/<NN>-<slug>.md`.
2. Set `"status":"completed"` and `"completedAt":"YYYY-MM-DD"` in the block.

It then shows under **Completed steps** — read-only, with its completion date, no
importance toggle and no danger zone. Completed history is for reading what was
done; it is never edited from the UI.

## Live highlighting

The page polls the filesystem on a short interval (the bar at the top). When a step
is added, or its importance / tasks change, only that step blinks (three pulses) and
scrolls into view — so when a background agent works, you see exactly what changed.
