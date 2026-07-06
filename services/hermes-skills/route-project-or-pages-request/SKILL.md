---
name: route-project-or-pages-request
description: >
  Decide FIRST — before any pipeline — which of THREE branches the owner's wish is. PAGES (public,
  for the site's visitors) vs the owner's OWN USE; and for own use, DURABLE AUTOMATION (it repeats
  on a schedule → you build a reusable tool with its own page: nodes + cron, running with zero load
  on you) vs ONE-OFF/DIRECT (a one-time/rare action → you just do it yourself with your own skills;
  you build NOTHING, no steps to repeat). The decisive test between durable and one-off is
  REGULARITY. Use for any "I want a service / tool / automation / do X for me" wish. Call
  owner_projects_route_request (:3229, read-only); if it returns a question, ask the owner VERBATIM
  and wait — the route is NEVER fixed without their explicit answer. The durable branch continues
  with owner_projects_survey_automation_needs (cron + integrations).
version: 1.1.0
metadata:
  hermes:
    tags: [route, fork, project, projects, pages, automation, one-off, direct, durable, regularity, private, public, service, tool, cron, integration, wish, before, default]
    related_skills: [orchestrate-project-by-steps, orchestrate-content-by-steps, compose-frozen-template, confirm-before-mutation, persist-env-var-with-rebuild]
---

# route-project-or-pages-request (Hermes)

The **first fork** for any "build me something / do X for me" wish. Before the frozen/real-dev
machinery, decide **which of three things** it is:

1. **PAGES** — something for the **site's visitors** (a page, a blog). → the content pipeline.
2. **DURABLE AUTOMATION** — for the **owner's own use** AND it **repeats on a schedule** (parse news
   every hour and ping Telegram, publish daily). → you build a reusable tool with its own page.
3. **ONE-OFF / DIRECT** — for the owner's own use but a **one-time** action (connect a browser, sign
   into Google, fetch credentials; search the web; do a one-off research). → you **just do it
   yourself**, right now, with your own skills. You build NOTHING.

> **The decisive question is REGULARITY.** Will this repeat regularly, on a schedule? Yes → build a
> durable automation. No → just do it once, build nothing. This is the owner's single key criterion.

> **Why durable exists.** Fractera agents don't run a REPEATABLE automation once and throw it away —
> they build the owner a **reusable tool with its own page**: a diagram of the process, a table of
> scheduled runs, a table of results. An "n8n for one single task". Once built, it runs on cron with
> **zero load on you** — you are not in its runtime loop. That page lives under `/projects/…` and
> only the owner/manager can see it.

> **Why one-off exists (do not skip it).** Most "do X for me" wishes are one-time: the owner gets
> Gmail access once, looks something up once, researches once. Those must NOT become a built project
> with steps to repeat — you simply do them. Turning a one-off into a durable project is a mistake.

## 🗣️ Talk to the OWNER in plain language only

No slugs, no ports, no "MCP". Ask simple questions, confirm simply: "So this is a tool just for you —
and will it repeat regularly, on a schedule, or is it a one-time thing?"

## Consult your own skills first (one-off candidacy)

Before you think about building anything, check whether one of your OWN skills already does the wish
directly — web search, research, browser automation, and the like. If a skill covers it and the wish
is one-time, that is a strong sign it is **one-off/direct**: just run the skill. Your existing skills
point at what you can do yourself without building a project.

## How to do it

1. The owner voices a wish → call **`owner_projects_route_request`** with the wish verbatim.
2. **It returns a question?** Ask the owner EXACTLY that question (in the dialogue language) and WAIT.
   The tool may ask two in turn: first public-vs-own, then (for own use) the **regularity** question.
   Never guess.
3. **It returns a proposal?** Still confirm with the owner using the returned confirm prompt.
4. After the owner answers explicitly → **call the tool again with `confirmed_choice`**
   (`public-pages` | `private-project` | `one-off-direct`). Only that call fixes the route and tells
   you what to do next. `private-project` = durable automation; `one-off-direct` = you do it, build
   nothing. **One exception:** if it asked the public-vs-own question and the owner said OWN USE,
   re-call with `{ request, for_own_use: true }` (not a confirmed_choice yet) — the tool then asks
   the decisive regularity question instead of repeating the first one.
5. **Pages branch** → your usual content pipeline (perceive → orchestrate-content-by-steps; real
   changes → delegate to a coding agent). Done.
6. **Durable branch** → call **`owner_projects_survey_automation_needs`** with `{}` — it gives you
   the two questions (scheduled jobs? external integrations?). Ask them; present integrations as a
   simple checklist ("YouTube, and it needs its API key"). Re-call with the answers. "I don't know"
   is a valid answer (`owner_does_not_know:true`) — then YOU decide at planning time. Then compose
   the project page (`orchestrate-project-by-steps` / `compose-frozen-template` project flow) and,
   for real features, delegate to a coding agent. API keys are saved through the env channel
   (`persist-env-var-with-rebuild`) — never pasted into code.
7. **One-off branch** → **perform it yourself now** with your own skills (or an already-built
   scenario). Do NOT decompose, do NOT build a project, do NOT create any steps for repetition. If a
   capability is genuinely missing and code is required, either delegate it as a ONE-TIME task to a
   coding agent or record a numbered blocker step — never build a repeatable project for a one-off.

## Hard rules

- **The route is NEVER fixed without the owner's explicit answer.** No confirmation → no pipeline.
- **A one-off wish is never turned into a built project** — no nodes, no cron, no repetition. You
  just do it.
- **A durable automation runs with zero load on you** — all logic lives in its cron nodes/tools; you
  are not in the runtime loop. This keeps token cost minimal.
- Both :3229 routing tools are read-only — they change nothing; all real changes go through the usual
  gated channels.
- You never program (your frame): a durable project's real features are delegated to a coding agent;
  a one-off that needs code is a one-time delegation, not a built project.
