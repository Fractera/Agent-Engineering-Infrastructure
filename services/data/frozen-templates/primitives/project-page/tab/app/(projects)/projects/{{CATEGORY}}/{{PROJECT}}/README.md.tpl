# {{PROJECT_TITLE_MD}}

> Fractera agents do not deliver an automation in final form straight from a request — they
> build a platform for developing repeatable automations: standardized reuse, a visual
> interface, input/output data in the local DB and vector memory, fast switching from the
> user UI. Fractera lets Hermes and a coding agent build a finished-cycle tool — an n8n for
> one single task: the user does not recreate the task, they open it in the UI, run it and
> track the result.

- **Path:** `/projects/{{CATEGORY}}/{{PROJECT}}`
- **Kind:** project (Projects layer, category `{{CATEGORY}}`)
- **Composed from:** the frozen `project-page` primitive (starter interface: description +
  react-flow process diagram + cron-queue table + results table)

## Placement & access

- **Appears in:** the account drawer Projects accordion (automatic — the folder is the registry)
- **Visible to:** ONLY signed-in with role(s): `architect`, `manager` (inherited from the zone layout)

## Finishing (coding-agent handoff)

- Shape the real process diagram in `_data/flow.ts` (data, not JSX).
- Describe the real project in `_data/description.ts`.
- Declare scheduled processes in `cron.json` in THIS folder — the substrate runner
  (`fractera-cron`) picks it up within a tick (no restart) and fills the queue/results
  tables on the page. Format (full reference:
  `CRUD-DOCS/workspace-standards/project-cron.md`):

  ```json
  {
    "jobs": [
      {
        "id": "publish-daily",
        "title": "Publish daily article",
        "schedule": "0 9 * * *",
        "action": { "type": "http", "url": "http://127.0.0.1:3000/api/...", "method": "POST" },
        "enabled": true
      }
    ]
  }
  ```

  `schedule` = 5-field cron, server local time. Actions: `{type:"http", url, method?, body?}`
  or `{type:"script", file}` (a Node script inside this folder; cwd = this folder; the slot's
  `.env.local` keys are in `process.env`). A run may report
  `{"resultTitle": "...", "artifactUrl": "..."}` (HTTP response JSON / the script's last
  stdout line) — it becomes a row in the results table.

<!-- fractera:meta
{"title": {{PROJECT_TITLE}}, "kind": "page", "base": "/projects/{{CATEGORY}}", "dynamic": false, "query": [], "description": {{PROJECT_PURPOSE}}, "tasks": [], "visibility": "rolesOnly", "roles": ["architect", "manager"], "cron": {{PROJECT_CRON}}, "integrations": {{PROJECT_INTEGRATIONS}}}
-->
