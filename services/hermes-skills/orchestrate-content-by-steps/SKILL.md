---
name: orchestrate-content-by-steps
description: >
  Do any content request the right way by calling ONE tool, owner_content_orchestrate. Use
  whenever the owner asks for content — "make a page about Apple", "add a news section", "add
  3 test news", "create a blog". You give only the intent (an action + a topic); the tool
  DECOMPOSES it by the site's state and runs every piece through the full step lifecycle
  (open a step → do it → deploy → record the deployment → close the step), with the deployment
  record as a hard gate. You do NOT chain tools, do NOT decompose by hand, do NOT write content
  or code. This is your DEFAULT for content requests — prefer it over compose / create-page.
version: 1.0.0
metadata:
  hermes:
    tags: [content, orchestrate, news, blog, documentation, page, section, add, create, steps, deployment, apple, default]
    related_skills: [compose-frozen-template, manage-content-collections, record-deployment, confirm-before-mutation]
---

# orchestrate-content-by-steps (Hermes)

When the owner asks for ANY content work, you call **ONE tool — `owner_content_orchestrate`** —
and give it the **intent**. It does everything correctly by itself: it works out what sub-steps
are needed, and runs each through the proper process (open a step → build → publish → record →
close), never skipping the deployment record. **You do NOT plan the steps, do NOT call other
content tools one by one, and do NOT write the article text.**

## 🗣️ Talk to the OWNER in plain language only

The owner is **NOT a developer**. Never expose internals (slug, deploy, step files, records).
Speak human: "I'll add a page about Apple", "I'll set up a news section".

## First: is this frozen-assembly, or real development?

You only do **frozen-assembly** here — standing up NEW pages/sections from frozen templates (a quick
prototype). If the owner wants to **change an existing page** or put **real content** into a page, that is
**real development** (coding agents), not you: say plainly *"I'm assembling from frozen templates — real
content or editing an existing page is a separate request for the coding agents"*, then open a handoff with
`owner_report_blocker_step`. If it's unclear which one, ask: *"a quick prototype from templates, or turning
it into a real project / changing something existing?"* (full rule in your SOUL, "Two scenarios").

## What you give the tool

- **"a page about X"** → `action: 'add-page', topic: 'X'` (e.g. topic `apple`).
- **"a news/blog/docs section"** or **"N test/sample news"** → `action: 'create-section'`
  (+ `samples: N` for test posts; the stub posts ARE the test news).
- optional `tab` (default news).
- **A page exists in ALL the site's languages at once — you give ONE topic, in English.** For a
  bilingual request ("in English and Spanish"), you STILL give ONE `topic` (the English concept);
  the single page comes up in every language. NEVER give one topic per language and NEVER hand the
  tool a translated title (a Spanish title makes a second, duplicate page). Translating an existing
  page is a separate action, not another add-page.
- **Several sections at once** ("news + a blog + docs, each in its own menus, docs for members only") → give
  the orchestrator the WHOLE set in ONE go (a `plan`); it builds them one after another, each placed in its
  menus with the right access, and asks you to approve the plan first. You do NOT do them across many turns.

That's it. **If the section does not exist yet, the tool creates it first, then adds the page —
automatically.** You do NOT do that in two manual calls.

## How to do it

1. **Confirm in plain language (§8.2):** call `owner_content_orchestrate` with `dry_run: true`.
   It returns the plan (the sub-steps). Tell the owner plainly: *"I'll set up a news section and
   add a page about Apple. Shall I proceed?"* Wait for yes.
2. **Do it:** call again without `dry_run`. The tool opens a step, builds, publishes, **records
   the deployment**, and closes the step — for each piece. It returns the result.
3. **Report:** tell the owner it's done and give the public links the tool returned. If a piece
   failed, the tool says which stage and that the step was kept open (nothing half-closed) —
   relay that plainly. If a tool ERRORED (broke), the fix is to repair it — never hand-write the
   content yourself and never delegate hand-writing to another agent.

## Tell the owner it will take a while (before you run)

A big request runs many steps, each published — it takes time and this chat stays quiet meanwhile. After they
approve, say plainly: *"I'm going into development now; it finishes by publishing the project and may take a
while — activity here will be hidden. You can watch it live at https://<your-site>/architecture and
https://<your-site>/development-steps."* Use the real site address. Those pages update in real time as each
piece is built and published.

## 🧊 You never write the article text

A page comes with placeholder text and correct structure (a clone of a frozen sample). You give
a topic/title; the tool does the rest. Writing real article prose is a later capability, not this.

## Never

- Never call compose / create-page one-by-one yourself — call `owner_content_orchestrate` and let
  it decompose.
- Never skip the deployment record (the tool enforces it — a step can't close without it).
- Never create one page per language for the same thing — one add-page (English topic) covers all
  languages; a translation is a separate step, not a second page.
- Never write code/files yourself, never ask the owner for secrets.

This capability ships to every agent — it does not depend on you (Hermes) existing.
