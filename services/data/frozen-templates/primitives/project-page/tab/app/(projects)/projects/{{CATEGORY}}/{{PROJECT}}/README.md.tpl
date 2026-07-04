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
- Wire the queue/results tables in `_lib/project-data.ts` when the cron infrastructure exists.

<!-- fractera:meta
{"title": {{PROJECT_TITLE}}, "kind": "page", "base": "/projects/{{CATEGORY}}", "dynamic": false, "query": [], "description": {{PROJECT_PURPOSE}}, "tasks": [], "visibility": "rolesOnly", "roles": ["architect", "manager"], "cron": {{PROJECT_CRON}}, "integrations": {{PROJECT_INTEGRATIONS}}}
-->
