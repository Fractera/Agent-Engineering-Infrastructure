---
name: route-project-or-pages-request
description: >
  Decide FIRST — before any pipeline — whether the owner's wish is PAGES (public, for the site's
  visitors) or a PROJECT (a private tool only the owner/manager uses: an automation, a scheduled
  job, a personal service). Use for any "I want a service / tool / automation / new part of the
  app" wish. Call owner_projects_route_request (:3229, read-only); if it returns a question, ask
  the owner VERBATIM and wait — the route is NEVER fixed without their explicit answer. The
  projects branch continues with owner_projects_survey_automation_needs (cron + integrations).
version: 1.0.0
metadata:
  hermes:
    tags: [route, fork, project, projects, pages, automation, private, public, service, tool, cron, integration, wish, before, default]
    related_skills: [orchestrate-content-by-steps, compose-frozen-template, confirm-before-mutation, persist-env-var-with-rebuild]
---

# route-project-or-pages-request (Hermes)

The **first fork** for any "build me something" wish. Before the frozen/real-dev machinery, decide:
is this **for the site's visitors** (pages) or **for the owner's own use** (a private project)?

> **Why projects exist.** Fractera agents don't run an automation once and throw it away — they
> build the owner a **reusable tool with its own page**: a diagram of the process, a table of
> scheduled runs, a table of results. An "n8n for one single task": the owner opens it, runs it,
> sees the outcome. That page lives under `/projects/…` and only the owner/manager can see it.

## 🗣️ Talk to the OWNER in plain language only

No slugs, no ports, no "MCP". Ask simple questions, confirm simply: "So this is a tool just for
you, not a public page — right?"

## How to do it

1. The owner voices a wish → call **`owner_projects_route_request`** with the wish verbatim.
2. **It returns a question?** Ask the owner EXACTLY that question (in the dialogue language) and
   WAIT for their answer. Never guess.
3. **It returns a proposal?** Still confirm with the owner using the returned confirm prompt.
4. After the owner answers explicitly → **call the tool again with `confirmed_choice`**
   (`public-pages` or `private-project`). Only that call fixes the route and tells you what to do
   next.
5. **Pages branch** → your usual content pipeline (perceive → orchestrate-content-by-steps; real
   changes → delegate to a coding agent). This skill's job is done.
6. **Project branch** → call **`owner_projects_survey_automation_needs`** with `{}` — it gives you
   the two questions (scheduled jobs? external integrations?). Ask them; present integrations as a
   simple checklist ("YouTube, and it needs its API key"). Re-call with the answers. "I don't
   know" is a valid answer (`owner_does_not_know:true`) — then YOU decide at planning time.
7. Then: compose the project page (`compose-frozen-template` project flow) and, for real features,
   delegate to a coding agent. API keys are saved through the env channel
   (`persist-env-var-with-rebuild`) — never pasted into code.

## Hard rules

- **The route is NEVER fixed without the owner's explicit answer.** No confirmation → no pipeline.
- Both :3229 tools are read-only — they change nothing; all real changes go through the usual
  gated channels.
- You never program (your frame): projects' real features are delegated to a coding agent.
