# {{PROJECT_TITLE_MD}}

> Fractera agents do not deliver an automation in final form straight from a request — they
> build a platform for developing repeatable automations: standardized reuse, a visual
> interface, input/output data in the local DB and vector memory, fast switching from the
> user UI. Fractera lets Hermes and a coding agent build a finished-cycle tool — an n8n for
> one single task: the user does not recreate the task, they open it in the UI, run it and
> track the result.

- **Path:** `/projects/{{CATEGORY}}/{{PROJECT}}`
- **Kind:** project (Projects layer, category `{{CATEGORY}}`)
- **Composed from:** the frozen `project-page` primitive (the result contract R9: description +
  react-flow process diagram + run panel + processes/results tables + scheduled-runs queue)

## Placement & access

- **Appears in:** the account drawer Projects accordion (automatic — the folder is the registry)
- **Visible to:** ONLY signed-in with role(s): `architect`, `manager` (inherited from the zone layout)

## The execution schema (contract R6)

The diagram in `_data/flow.ts` and the workflow in
`app/api/projects/{{CATEGORY}}/{{PROJECT}}/_workflow/definition.ts` are ISOMORPHIC — the
diagram is the project's ONLY execution schema: **what is not on the diagram does not exist
in the project.** When the project is born from a decomposition
(`orchestrate-project-by-steps`), BOTH files are generated from the graph — the flow data on
every approved run (derived, deterministic), the workflow skeleton once (each `use step`
carries a `// node:<id>` marker). Implement ONLY the step bodies; never add a step, action
or shadow code outside the schema — a new action = extend the decomposition graph and re-run
the engine. The engine validates the markers on every run and reports any drift.

## Finishing (coding-agent handoff)

- Shape the real process diagram in `_data/flow.ts` (data, not JSX). Decomposed project →
  the graph is the source; re-run the engine instead of hand-editing.
- Implement the real workflow step BODIES in
  `app/api/projects/{{CATEGORY}}/{{PROJECT}}/_workflow/definition.ts` (see Workflow below);
  keep the `// node:<id>` markers — they are the R6 isomorphism check.
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

## Workflow (durable execution)

`app/api/projects/{{CATEGORY}}/{{PROJECT}}/_workflow/definition.ts` is the project's
durable workflow (Workflow DevKit) — the EXECUTABLE mirror of the diagram: steps `work`
-> `store` -> `publish` correspond to the flow nodes (the `trigger` node is the run
route / cron). It lives next to its run route under `app/api/` (NOT in this page folder:
WDK derives the workflow name from the file path and forbids the parentheses of route
groups like `(projects)`). A run survives a process restart and resumes mid-flight; it
journals itself into `project_cron_runs` (`created_by='wdk'`), so runs appear in the
queue/results tables of this page automatically.

- **Trigger route:** `POST /api/projects/{{CATEGORY}}/{{PROJECT}}/run` (body
  `{"input": "..."}` optional; needs `X-Agent-Identity` — the auth gate covers `/api/*`).
- **Scheduling:** `fractera-cron` stays the ONLY scheduler. To run the workflow on a
  schedule, declare an http job in `cron.json` pointing at the trigger route:

  ```json
  {
    "jobs": [
      {
        "id": "run-workflow-daily",
        "title": "Run the project workflow",
        "schedule": "0 9 * * *",
        "action": { "type": "http", "url": "http://127.0.0.1:3000/api/projects/{{CATEGORY}}/{{PROJECT}}/run", "method": "POST" },
        "enabled": true
      }
    ]
  }
  ```

  The runner's own journal row records the trigger firing (no result title); the
  workflow's row carries the real result.
- **Persistence:** the Local World stores run state under `WORKFLOW_LOCAL_DATA_DIR`
  (on a Fractera VPS: `/opt/fractera/.workflow-data`, outside the swappable slot — survives
  a slot rebuild). BOTH vars must sit in the slot's `.env.local`:
  `WORKFLOW_TARGET_WORLD=local` AND `WORKFLOW_LOCAL_DATA_DIR=...` — with the target world
  unset, `withWorkflow` (next.config) force-sets the data dir to `.next/workflow-data`,
  which a rebuild wipes.

<!-- fractera:meta
{"title": {{PROJECT_TITLE}}, "kind": "page", "base": "/projects/{{CATEGORY}}", "dynamic": false, "query": [], "description": {{PROJECT_PURPOSE}}, "tasks": [], "visibility": "rolesOnly", "roles": ["architect", "manager"], "cron": {{PROJECT_CRON}}, "integrations": {{PROJECT_INTEGRATIONS}}}
-->
