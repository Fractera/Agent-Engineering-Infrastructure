---
name: manage-content-collections
description: >
  Create, edit or delete CONTENT in the site's collections — a whole GROUP (a tab:
  news / blog / documentation) or a single PAGE (a post inside a tab). Use when the
  owner says "add a news article", "add a page to the blog", "edit this post",
  "translate this article", "delete that page", "remove the news section", or "rename
  the blog section". You pass the CONTENT (a structured data object — describing content
  is NOT programming); the tool writes the files, by construction, with ZERO code
  generation, so any model gives the identical result. ANTI-DESTRUCTIVE: if a collection
  already exists you ADD a page or EDIT it — never recreate, never offer to "rewrite all".
  Integrity is enforced (folder===slug, only the app's languages, no foreign-script junk,
  founder block last, a required root anchor). Self-sufficient: no Hermes, no other agent.
version: 1.0.0
metadata:
  hermes:
    tags: [content, news, blog, documentation, article, post, page, collection, page-group, add, edit, delete, translate, crud, content-op]
    related_skills: [compose-frozen-template, create-multilingual-content-entry, manage-app-settings, confirm-before-mutation]
---

# manage-content-collections

The ONE way to do content CRUD over the site's co-located collections — **deterministic
file operations, NO code generation.** You supply DATA (a content object); the tool writes
the `_data/*` files, copies the thin route skeleton, and regenerates the post list.
Scenario #1 of 8 (4 file-system + 4 database); the file-system set is here.

This skill is **self-sufficient**: plain file operations through one tool. It does NOT
depend on Hermes, on memory, or on any other agent.

## The mental model (read before acting)

- A **group** = a tab/collection (`app/[lang]/<tab>/` — news, blog, documentation). A
  **page** = one post in a tab (`app/[lang]/<tab>/<slug>/`). Both are **co-located static
  folders**; the post list (`_list.generated.ts`) is auto-derived, never hand-written.
- **🧊 Phase 1: structure is TAKEN, never generated.** A page is a **CLONE of a frozen stub**
  (a `compose --samples` post that already has the vetted block structure). You do **NOT**
  build the body. You pass only **light metadata** — `slug` + optional `title`/`date`/`tags` —
  and the tool clones the stub under the new slug. **Passing a body (`blocks`) is REFUSED.**
  Authoring real text into the frozen slots is **Phase 2 (step 155)**, a later step — not here.
- **6 operations = one tool**, discriminated by `operation × target`:

  | operation | target | what you pass | what happens |
  |---|---|---|---|
  | create | group | `tab`, `labels`, `format?`, `languages?`, `samples?` | stands up a new tab (delegates to the Frozen Template Constructor) |
  | create | page  | `tab`, `slug`, opt `title`/`date`/`tags` | **clones the frozen stub** under the new slug; list regenerated |
  | edit   | page  | `tab`, `slug`, `title`/`date`/`tags` | edits **metadata only** (structure stays frozen; body editing = step 155) |
  | edit   | group | `tab`, `ui` | rewrites the tab's UI chrome (title/breadcrumb/labels) |
  | delete | page  | `tab`, `slug` | removes the post folder; list regenerated |
  | delete | group | `tab` | removes the whole tab + drops its parser-fs line |

- **🔑 Several test/placeholder posts at once → do NOT loop create-page.** Use **`compose
  --samples N`** (skill `compose-frozen-template` / `owner_template_compose_structure`): the
  stub posts ARE the test news — one shot, correct structure, ~seconds. `create-page` is for
  adding ONE more stub-clone under a chosen slug.

## 🛑 Anti-destructive (the rule that was violated)

- A collection **already exists → ADD a page (`create page`) or EDIT it.** NEVER recreate
  it, and NEVER ask "should I rewrite all the articles?" — that question is itself wrong.
  `create group` REFUSES an existing tab and tells you to add a page instead.
- `edit`/`delete` require the target to exist (no silent create).

## 🔒 Integrity contract (enforced — a violation is refused, not shipped)

- **`folder === slug`** (the post URL is its folder name; a `slug` field that disagrees =
  broken links — exactly the `apple` vs `apple-test` 404 bug). The clone names the folder by `slug`.
- **🔒 ONE post spans all languages — slug = English identifier.** The `slug` is a stable,
  language-agnostic identifier chosen ONCE from the base (English) title; the SAME `slug` serves
  every language (`/en/<slug>`, `/es/<slug>`). A translation lives in a `<lang>.ts` cell of the
  SAME post — NEVER a second post. Do NOT slugify a translated title and do NOT `create page` once
  per language (a Spanish title would clone a second `hemos-…` post). Translating is a separate path
  (`owner_content_translate_pending`), not `create page`.
- **No body authoring here.** A `blocks`/body payload is **refused** — the structure comes from
  the frozen stub, so block structure, the founder block, and the root anchor are inherited
  correct by construction (no need for you to supply or order them). Body text = step 155.
- **Metadata languages only from the app's declared set** (`en` + whatever is configured —
  read the slot's `NEXT_PUBLIC_SUPPORTED_LANGUAGES`). NEVER invent a language the site does not
  ship (a stray `es` is refused). New language? Add it via **manage-app-settings** first (rebuild).
- **No foreign-script artifacts** in `title`/`tags` (CJK / Arabic … — a model artifact).

## Confirm before mutating (mandatory — §8.2)

Mutating writes files. Restate first and wait for explicit confirmation:
> If I understood correctly: **<operation> <target>** «**<tab>**/**<slug>**» — <one line on
> what changes>. Shall I proceed?

Call with `dry_run: true` first to preview the exact files, show the owner, get a yes, then
call without `dry_run`.

## If the tool errors (not a refusal)

A **refusal** (a plain validation reason — stray language, duplicate, missing anchor) means fix
the content and retry. An **error** (`MODULE_NOT_FOUND`, a 500, "handler not found", a timeout)
means the tool/infrastructure is **broken** — that is NOT "no tool exists". **Stop, report the
exact error, and wait.** Do **not** hand-author the content as a workaround, and do **not**
delegate hand-authoring to another agent — a broken tool is repaired, never bypassed.

## After a successful mutation

- The result is **automatically fixed in the Deployment table** (`deployment_records`) by
  the tool — you do not record it separately.
- **🔁 REBUILD so it is visible (never skip).** The slot runs in production; new files are
  invisible until a rebuild. Call **`owner_deploy_rebuild_slot`** (dry_run → "I'll rebuild,
  ~2–4 min, ok?" → for real), or if you lack that tool, tell the owner to press **Deploy**
  in the footer. Then report the mode-aware **`view_urls`** the tool returned — never an
  internal/plain-HTTP host, never a deploy secret in chat.

## How to call

- **MCP (every agent):** `owner_content_manage_collection` with
  `{ operation, target, tab, slug?, data?, ui?, labels?, format?, languages?, samples?, dry_run? }`.
  Always `dry_run: true` first.
- **Standalone (lone agent, no MCP)** — pure file edits, write your content to a JSON file:
  ```bash
  # add a page (content in data.json: { en: { title, blocks, faq, … }, ru?: {…} })
  node .agents/skills/manage-content-collections/manage-content-collections.mjs \
    --out . --op create --target page --tab news --slug my-post --data data.json
  # edit / delete a page, edit / delete a group — same tool, other --op/--target
  node .agents/skills/manage-content-collections/manage-content-collections.mjs \
    --out . --op delete --target page --tab news --slug my-post
  npx tsc --noEmit   # then REBUILD (Deploy) to see it
  ```
  For `create group` pass `--store <frozen-templates-dir>` (it delegates to the constructor).

## 🌐 Adding a LANGUAGE to existing content → NOT this tool

If the owner wants to **add a new language to an existing site** ("add Armenian to all pages",
"make the site multilingual", "translate the whole site") — **do NOT use this tool.** `create page`
refuses an existing page and `edit page` cannot add a locale or a body. Use the **expand-site-language**
skill / `owner_content_add_site_language` — it fans the language out across every group and post (seeded
with the default language, noindex until translated) and opens a translation step. That is the only
correct path; improvising it here will refuse or leave the site broken.

## When to use which skill

- **A whole new structure** (news/blog/docs/catalogue) → `create group` here, or the
  **compose-frozen-template** skill directly (this tool's create-group delegates to it).
- **Adding / editing / deleting individual content** (a post, a section's chrome) → here.
- A single multilingual document, hand-authored → **create-multilingual-content-entry**
  (this tool automates exactly that, deterministically).

## Source of truth (do not duplicate)

The co-location standard lives in `CRUD-DOCS/workspace-standards/content-engine.md`; the
constructor strategy in `frozen-template-constructor.md`. The executor is
`manage-content-collections.mjs`. This is a self-sufficient project skill: the same skill
ships to every agent (`.agents/skills` + `.claude/.gemini/.qwen/skills` + Hermes). It does
not depend on Hermes existing — any single agent can do content CRUD on its own.
