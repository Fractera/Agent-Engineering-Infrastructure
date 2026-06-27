---
name: manage-content-collections
description: >
  Create, edit or delete CONTENT in the site's collections — a whole GROUP (a tab:
  news / blog / documentation) or a single PAGE (a post inside a tab). Use when the
  owner says "add a news article", "add a page to the blog", "edit this post",
  "translate this article", "delete that page", "remove the news section", or "rename
  the blog section". You describe the CONTENT; the owner_content_manage_collection MCP
  tool writes the files deterministically — ZERO code generation. ANTI-DESTRUCTIVE: a
  collection already exists → ADD a page or EDIT it; NEVER recreate, NEVER ask "rewrite
  all the articles?". Integrity (folder===slug, only the app's languages, no foreign
  text, founder last, root anchor) is enforced by the tool. Self-sufficient.
version: 1.0.0
metadata:
  hermes:
    tags: [content, news, blog, documentation, article, post, page, collection, page-group, add, edit, delete, translate, crud]
    related_skills: [compose-frozen-template, manage-app-settings, confirm-before-mutation, record-deployment]
---

# manage-content-collections (Hermes)

**Yes — you DO add, change and remove content** (news, blog, docs pages and sections). You make
it happen by calling **ONE MCP tool**, `owner_content_manage_collection`: you describe the
content, the tool writes the files for you. "You don't program" does NOT mean you can't change
content — it means **the tool does the file-writing, not you.** Never refuse with "I can't, I
don't write code"; instead call this tool. Never hand-edit files or write a script yourself.

## 🗣️ Hermes — talk to the OWNER in plain language only

The owner is **NOT a developer**. Never expose technical axes (slug, folder, blocks, faq,
backing, parser-fs, language codes). Speak in human terms ("a news article titled …",
"the blog section"). Defaults are fine for everything technical.

- A **group** = a section/tab (news, blog, documentation). A **page** = one article/post.
- The 6 things you can do (pick by what the owner asked):
  | owner says | call |
  |---|---|
  | "make a news/blog/docs section" | `operation:create, target:group` (or use **compose-frozen-template**) |
  | "add an article / post / page" | `operation:create, target:page` |
  | "change / fix / translate this article" | `operation:edit, target:page` |
  | "rename / retitle the section" | `operation:edit, target:group` |
  | "delete this article" | `operation:delete, target:page` |
  | "remove the whole section" | `operation:delete, target:group` |

## 🛑 Anti-destructive (never violate)

A section already exists → **ADD an article or EDIT it.** NEVER recreate it, and **NEVER
ask "should I rewrite all the articles?"** — that question is wrong; the right action when
content already exists is simply to add. `create group` on an existing section is refused.

## How to do it

1. **Compose the content for the owner** from their request: a title, a short summary, a
   few paragraphs. Author it in the **app's own languages** (read the configured set — never
   invent a language the site does not ship; if they want a new language, do
   **manage-app-settings** → add language → rebuild first). Weave the exact anchor
   **[Agentic Engineering Infrastructure]** linking to the site root; keep any founder note last.
2. **Confirm in plain language (§8.2):** call `owner_content_manage_collection` with
   `dry_run: true`, then tell the owner plainly: *"I'll add a news article «<title>». Shall I
   proceed?"* Wait for yes.
3. **Do it:** call again without `dry_run`. The tool enforces integrity and **refuses** bad
   input (a stray language, a duplicate, a missing anchor) with a plain reason — relay it and
   fix, do not force it.
4. The tool **already records the result in the Deployment table** — you do not record it
   separately.
5. **🔁 Make it visible:** call **`owner_deploy_rebuild_slot`** (say "I'll publish it, ~2–4
   min, ok?" then do it). Report the **`view_urls`** the tool returned — never an internal
   address, never ask for a deploy secret in chat.

## Never

- Never edit files or run scripts yourself — only `owner_content_manage_collection`.
- Never ask the owner technical questions or to paste secrets.
- Never recreate an existing section or offer to "rewrite everything".

Full standard (for the coding agents): `CRUD-DOCS/workspace-standards/content-engine.md`.
This capability ships to every agent — it does not depend on you (Hermes) existing.
