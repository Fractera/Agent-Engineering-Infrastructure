# Glossary

> Workspace term map — approved abbreviations and preferred phrasings so every
> agent in this project reads them the same way (e.g. aws -> ai-workspace).
> Edited via the Admin /service/glossary page (:3002); this file is the source of truth.

| Term | Meaning |
|---|---|
| AWS | ai-workspace |
| Automation (Rule) | The container "when X, under condition Y, do Z" — one Projects-layer project. Canon: CRUD-DOCS/workspace-standards/automation-ontology.md (READ IT before authoring/extending any automation) |
| Trigger | Event source starting a run (message / cron schedule / manual / webhook); node kind `trigger` |
| Hook | A user's spoken phrase bound to ONE Action (global `project_hooks`, normalized lowercase, app-wide unique) |
| Condition | A DECLARED guard "run only if …" on an Action/Step — shown on the diagram and in the records table; executed in step code (R6) |
| Action | First-class named outcome = a branch of steps (id/title/color/hooks/condition/channel). Configuring an automation = configuring Actions bound to Hooks |
| Router | The classifier step turning an event into an action id (e.g. detect-hook); node kind `router` |
| Step | Atomic operation node (kind `step`/`transform`), implemented under its `// node:<id>` marker in the durable workflow |
| Integration | External service + its env keys (Telegram, OpenAI, LightRAG) — declared, never hardcoded |
| Channel | Where an Action's output is delivered (e.g. telegram-bot-chat) — a field on the Action |
| State | Declared persistent data between runs (poll cursor, vector memory) — registry `state[]` in the automation graph |
| Run | One execution instance (runId/status/journal in `project_cron_runs`) |
| Record | A durable result row (+ memory document) shown in the universal records table: Action · Hook · Summary · Condition · Due · Created. Owner-deletable — the last column's Delete button (with confirm) removes the DB row AND its vector document (best-effort via the stored memory_doc_id) |
