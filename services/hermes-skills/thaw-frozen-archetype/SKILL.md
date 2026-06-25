---
name: thaw-frozen-archetype
description: >
  Add a whole group of pages (a news section, a blog, a documentation section) to
  the site WITHOUT generating code — by thawing a frozen archetype from the closed
  store. Use when the owner says "make me a news page", "add a blog", "I want a
  documentation section", or "add news to my site". The thaw is pure file copy +
  token substitution (the thaw-frozen-archetype.mjs emitter / the
  owner_archetype_thaw_content_group MCP tool): it installs the shared content
  engine if absent, then creates the localized router + N placeholder posts (Lorem
  body + placeholder image), translating the section label into the configured
  languages. Fast, cheap, identical across any model. Self-sufficient: no Hermes,
  no other agent required. If the request does not fit a frozen archetype (a shop
  with a cart, a course with graded tests, an interactive app screen) — refuse
  honestly and offer to author a new archetype; never force this one.
version: 1.0.0
metadata:
  hermes:
    tags: [archetype, thaw, frozen, scaffold, news, blog, documentation, content, collection, page-group]
    related_skills: [create-multilingual-content-entry, propose-new-agent-skill-or-mcp, persist-env-var-with-rebuild]
---

# thaw-frozen-archetype

Stand up an entire page group (news / blog / documentation) by **thawing a frozen
archetype** instead of hand-writing files. The frozen archetype is an inert,
parameterized "project-in-a-box" kept in the closed store (the data service); the
thaw is **pure file copy + token substitution — no LLM code generation**, so any
model produces the same result in seconds.

This skill is **self-sufficient**: it is plain file operations plus one HTTP GET. It
does NOT depend on Hermes, on memory, or on any other agent. A lone agent can thaw
an archetype on its own.

## What gets thawed (content-collection archetype)

A localized, static-first article collection:
- the **router/index** page `app/[lang]/<tab>/` that lists the posts,
- **N placeholder posts**, each inheriting the full page standard (SEO, OpenGraph,
  JSON-LD Article + BreadcrumbList + FAQPage, breadcrumbs, table of contents, FAQ,
  author byline) but with **Lorem-ipsum body + a placeholder image**,
- the **shared content engine** (`lib/content`, `components/content-page`,
  `lib/brand`, `lib/author`, `lib/seo`) — installed **only if the slot lacks it**
  (idempotent), because the engine belongs to no single tab.

`format` picks the preset: `news` (NewsArticle, person author) · `blog`
(BlogPosting, organization author) · `document` (TechArticle, person author).

## Two ways the owner asks (both supported)

### A. Directive — "make me a news page"
The intent and target are clear. Confirm, then thaw:
1. Read the app's configured languages (the active language set) and the brand.
2. Translate the single section label into each language (e.g. `News` → `Новости`)
   — one word, done by you; this is NOT code generation.
3. **Confirm before mutating** (mandatory — see below): restate tab, format,
   languages, label translations, sample count.
4. Thaw (MCP tool or local emitter). Then run `npm run gen:lists` and report.

### B. Conversational — "add news to my site"
The target is ambiguous. Do discovery first:
1. Check whether a suitable tab already exists (`owner_archetype_list_frozen` for
   archetypes; look on disk for an existing `app/[lang]/<tab>/`).
2. Ask what the owner means by "news" and **where** it should live (which tab slug),
   so future additions follow ONE agreed contract.
3. Once agreed, thaw the archetype to establish the tab; from then on, new posts go
   in via `create-multilingual-content-entry` (one post = one folder) under that
   contract.

## Match the request to an archetype (and refuse honestly)

Consult the archetype **manifest** (`fits` / `doesNotServe`) — do not pattern-match
from general knowledge:
- Request maps to a `fits` intent (news, blog, docs, articles, announcements,
  changelog, guides, knowledge base) → thaw the content-collection archetype.
- Request maps to `doesNotServe` (shopping cart / checkout / payments, a course
  with graded tests / progress, an interactive app screen, forms that persist
  visitor input) → **honest refusal**: say this frozen archetype builds static
  article collections, not that; **do not force it and do not generate code from
  scratch**. Offer to open a new step or a `propose-new-agent-skill-or-mcp` draft to
  author the needed archetype. (This is the content instance of capability-grounded
  selection at scale — match to a real capability or refuse.)

## Confirm before mutating (mandatory)

Thawing writes files. Before any write, restate exactly what will be created and
wait for explicit confirmation:
> If I understood correctly: create a **<format>** collection at **/<tab>** in
> languages **<langs>**, label **<label per lang>**, with **<N>** placeholder
> posts. Shall I proceed?

## How to thaw

- **With the MCP tool** (registered in every agent): `owner_archetype_thaw_content_group`
  with `{ tab, format, languages, labels, samples }`. The server fetches the frozen
  tree from the store and runs the emitter into the slot's `app/`.
- **Standalone** (lone agent, no MCP): fetch the archetype from the data service and
  run the local emitter:
  ```bash
  # 1) fetch the frozen tree to a temp dir (data service, token-auth)
  curl -s -H "X-Agent-Identity: <you>" \
    http://localhost:3300/archetypes/content-collection > /tmp/arch.json
  #    (the skill/host unpacks arch.json's file map into /tmp/content-collection/)
  # 2) thaw it into the slot
  node .agents/skills/thaw-frozen-archetype/thaw-frozen-archetype.mjs \
    --store /tmp/content-collection --out . \
    --tab news --format news --languages en,ru \
    --label-en News --label-ru Новости --samples 2
  ```

## After thawing

1. `npm run gen:lists` (parser-fs) so the placeholder posts appear in the index.
2. `npx tsc --noEmit` = 0 (Windows: never `npm run build`).
3. If the slot keeps `app/sitemap.ts` / `llms.txt`, add the new `/<tab>` route.
4. Report: the tab, format, languages, label translations, how many posts, and that
   it was thawed (no code generated). Tell the owner to replace the Lorem copy and
   the placeholder image, and that adding the next post is one folder
   (`create-multilingual-content-entry`).

## Source of truth (do not duplicate)

The archetype tree + `manifest.json` live in the closed store
(`services/data/frozen-archetypes/<id>/`, served by the data service). The emitter
is `thaw-frozen-archetype.mjs`. If the page standard changes, update the frozen
archetype in the store — not a parallel doc. Full design + research:
`/code/next-step/146-frozen-archetypes-thaw-without-codegen.next-step.md`.

This is a self-sufficient project skill: the same `thaw-frozen-archetype` is shipped
to every coding agent (`.agents/skills` + `.claude/.gemini/.qwen/.kimi/skills`) and
to Hermes. It does not depend on Hermes existing — any single agent can thaw on its own.
