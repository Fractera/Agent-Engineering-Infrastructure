# manage-app-settings

Skill for changing what the deployed app says about itself — its App Settings
(branding, SEO, OpenGraph, PWA, author, social, JSON-LD, local business) and its
language set. This is the owner asking you, in plain words, to rebrand or retune
the site ("change my description to 'Рога и копыта'", "use my domain example.com",
"turn on the Organization schema", "add French") instead of clicking fields in the
Admin → App Settings panel. You do the same job through the app-settings-bridge MCP
(:3218) — every other coding agent (Claude, Codex, Gemini, Qwen, Kimi) has the same
tools, so you are not special here; you just also orchestrate.

## Where the settings live

A plain JSON file on disk — `app/APP-CONFIG/app-config.json` — read by the Shell on
every render and deep-merged over code defaults. Text changes apply on the app's
**next page load** (the setter triggers revalidation; the pages stay static — no
rebuild). The **language set** is the exception: it lives in build-time env and only
takes effect after a **rebuild** (a few minutes) — say so honestly.

## The tools (owner tier)

- `owner_app_settings_list_text_fields` — every text setting: path, label, role
  (what it does / why it matters), current value, and `is_set` (filled by the owner
  vs still the shipped default). Read-only. Use it to discover valid paths first.
- `owner_app_settings_list_unfilled_fields` — only the settings still empty / on the
  default, so you can nudge the owner to complete them (e.g. SEO verification codes).
- `owner_app_settings_set_text_value { path, value }` — set ONE field. `choice`
  fields must match their options; `flag` takes true/false; `number` takes a number.
  Image fields are rejected — tell the owner to upload images in the panel.
- `owner_app_settings_list_languages` / `owner_app_settings_set_languages
  { languages, defaultLanguage }` — read / set the supported languages. `en` is
  always kept as the fallback. Setting languages needs a rebuild to appear.

## How to handle a request

1. **Confirm before mutating** (the `confirm-before-mutation` skill applies): restate
   what you will change, old → new, and wait for the owner's go before writing.
2. Discover the path with `owner_app_settings_list_text_fields` if you are unsure.
3. Call `owner_app_settings_set_text_value` (one field per call).
4. Report the result. For a text change: "done — shows on the next page load."
   For a language change: "saved — it appears after a rebuild (a few minutes)."

## Worked examples

- "Change my description to 'Рога и копыта'" →
  `owner_app_settings_set_text_value(path="description", value="Рога и копыта")`.
- "Use my domain example.com" → set `url`, usually also `seo.canonicalBase`.
- "Turn on the Organization schema" →
  `owner_app_settings_set_text_value(path="jsonLd.organization", value=true)`.
- "Add French" → `owner_app_settings_set_languages(languages=["en","ru","fr"])`,
  then tell the owner it appears after a rebuild.
- "Change the logo" → images are panel-only; ask the owner to upload it in
  Admin → App Settings.
