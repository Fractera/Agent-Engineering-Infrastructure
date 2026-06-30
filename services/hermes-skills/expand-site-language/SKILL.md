---
name: expand-site-language
description: >
  Add a NEW language to an EXISTING site across ALL its content, and translate the pages later
  without blocking. Use when the owner says "add Armenian / Spanish / French to the whole site",
  "make the site multilingual", "translate the whole site into X", "scale this to more languages",
  "add a new language to all pages/sections", or "add a locale". This is the ONLY correct way to
  add a language to existing content. Do NOT use compose-frozen-template, manage-content-collections,
  or owner_template_update_group for this — they cannot add a per-page locale to existing pages and
  will refuse or break the site. Two tools: owner_content_add_site_language (fan the language out,
  seeded with the default language so the site is valid instantly, no translation API) and
  owner_content_translate_pending (the non-blocking runner — you translate the strings later). Self-
  sufficient: no Hermes, no other agent.
version: 1.0.0
metadata:
  hermes:
    tags: [language, multilingual, i18n, locale, translate, translation, add-language, hreflang, seo, armenian, spanish, french, scale-languages, internationalization, expand]
    related_skills: [manage-app-settings, manage-content-collections, compose-frozen-template, perceive-workspace, confirm-before-mutation]
---

# expand-site-language

The ONE way to take a site that already has content in one or two languages and **safely scale it
to another language**. Deterministic file operations, **NO code generation, NO external translation
API** (you are the translator — subscription rule). Self-sufficient: any single agent can do it.

## 🛑 Why a dedicated capability (do not improvise)

Adding a language to an **existing** site means creating a `_data/<lang>.ts` for **every** group and
**every** post, patching each `index.ts` + `group.ts`, and protecting SEO. **No other tool does this:**

- `owner_content_manage_collection` — `create page` refuses an existing page; `edit page` edits only
  metadata and refuses a body/new locale. It **cannot** add a language to existing pages.
- `owner_template_update_group` — changes only the menu manifest's `languages`; it does **not** create
  the per-page locale files → the language shows in the menu but the pages are broken.
- `compose-frozen-template` — re-composing a group **overwrites** existing content. Never use it to add
  a language.

If you are tempted to reach for one of those to add a language: **stop and use this skill instead.**

## The model

- Languages are **build-time** (`NEXT_PUBLIC_SUPPORTED_LANGUAGES`). A language must be in the set
  **before** you fan it out — add it via **manage-app-settings** first, then rebuild.
- Each post = `_data/{meta, en(base), <lang>(override), index}`. Each group = `_data/{en, <lang>, index,
  group.ts}`. The fan-out writes the `<lang>` files and patches the indexes — by construction.
- **Seed = the DEFAULT language's content** (e.g. default `es` → the new language starts as a copy of
  Spanish). The site is **valid the instant the build finishes** — no broken pages, no machine
  translation. Every language-dependent link is rewritten to the new language.
- **🔒 Doorway guard (SEO, critical).** A seed still shows the default language's text, so each seed is
  marked `needsTranslation` and the engine serves it as **`robots: noindex`** — Google never indexes a
  cross-language duplicate. `canonical` + `hreflang` stay correct automatically (derived from the
  language set). When a page is translated, the marker clears and it becomes indexable on the next Deploy.
- **Non-blocking.** The fan-out opens **one dev-step per language** (`DEVELOPMENT-STEPS/NEW-STEPS/
  NN-translate-<lang>.md`) listing the pages to translate. Translation happens later, in its own step,
  possibly with a different model — the main work is never blocked by translation limits.

## Flow

1. **Ensure the language is in the set.** Not there yet → add it with **manage-app-settings**
   (`owner_app_settings_set_languages`) and rebuild. The fan-out refuses a language not in the set.
2. **Fan it out.** `owner_content_add_site_language { lang }` — `dry_run: true` first (restate +
   confirm, §8.2), then for real. **REBUILD** (`owner_deploy_rebuild_slot`) to publish the new routes
   (seeded, noindex). The menus (header / footer / left / right) update automatically.
3. **Translate later (non-blocking), when you choose.** `owner_content_translate_pending { lang }` in a
   loop: it returns the next pending page → you translate the **strings only** (keep the block kinds and
   order, keep the root anchor and `/<lang>/` links) → call again with `{ op:"write", tab, slug,
   translations }`. Repeat until `remaining: 0`. Honor any owner notes on the dev-step (e.g. "focus on
   Spanish law, link real statutes") for regional value.
4. **The runner does NOT deploy.** When translations are written, tell the owner: *press **Deploy** in
   the footer* to publish — the translated pages then flip from noindex to indexable.

## Confirm before mutating (§8.2)

> If I understood correctly: **add language «<lang>»** across <N> groups / <M> pages, seeded with the
> default language «<def>» (noindex until translated), and open one translation step. Shall I proceed?

`dry_run: true` → preview → owner yes → real call.

## If the tool errors (not a refusal)

A **refusal** (language not in the set, structure-parity violation) → fix and retry. An **error**
(`MODULE_NOT_FOUND`, 500, timeout) means the tool is **broken** — stop, report the exact error, wait.
Never hand-author the locale files as a workaround; a broken tool is repaired, never bypassed.

## How to call

- **MCP (every agent):**
  - `owner_content_add_site_language { lang, dry_run? }`
  - `owner_content_translate_pending { lang }` → then `{ lang, op:"write", tab, slug, translations:{ fields, blocks, faq } }`
- **Standalone (lone agent, no MCP)** — plain file edits:
  ```bash
  # 1) fan out (default-language seed + noindex + per-language step)
  node .agents/skills/expand-site-language/fan-out-site-language.mjs --out . --lang hy --dry-run
  node .agents/skills/expand-site-language/fan-out-site-language.mjs --out . --lang hy
  # 2) translate, page by page (you supply the translated strings)
  node .agents/skills/expand-site-language/translate-content-page.mjs --out . --lang hy --op next
  node .agents/skills/expand-site-language/translate-content-page.mjs --out . --lang hy --op write \
    --tab news --slug sample-1 --data translations.json
  npx tsc --noEmit   # then REBUILD (Deploy) to publish
  ```

## Self-sufficient

Same skill ships to every agent (`.agents/skills` + `.claude/.gemini/.qwen/skills` + Hermes). It does
not depend on Hermes existing — any single agent can extend a site's languages on its own.
