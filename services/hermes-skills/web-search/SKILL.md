---
name: web-search
description: >
  Search the live web and answer from cited results — a ONE-OFF/DIRECT ability (step 190). Use it
  when the owner asks you to look something up, find current information, check a fact, or gather
  sources: a one-time action you perform YOURSELF and answer. Never turn a "search the web" wish
  into a built durable automation — just search and reply. Via MCP: owner_web_search
  (web-search-bridge :3231, read-only), backed by exa.ai (needs the EXA_API_KEY integration). This
  is the raw search under the deeper `research` ability. Self-sufficient: every agent carries this
  skill and the bridge registration.
version: 1.0.0
metadata:
  hermes:
    tags: [web, search, internet, lookup, exa, one-off, direct, sources, current, research, find]
    related_skills: [route-project-or-pages-request, prepare-automation-knowledge]
---

# web-search

A **Hermes-native one-off ability**. The request router (`route-project-or-pages-request`) sends
one-off/direct wishes here — "search the web for X", "look this up", "what's the latest on Y" — that
must **not** become a built durable automation. You perform the search yourself and answer; you
build nothing, materialize no nodes for repetition.

> **One-off, not a project.** A search is a one-time action. Do it, cite the sources, answer. If the
> owner instead wants something that runs on a schedule (e.g. "check this site every hour"), that is
> the DURABLE branch — a project, not this tool. The decisive test is regularity (see
> `route-project-or-pages-request`).

## How to use it

1. Call **`owner_web_search`** (`:3231`, read-only) with `{ query }` (natural language). Optional:
   `num_results` (default 5, max 10), `snippet_chars` (default 500), `include_domains`, `category`.
2. You get back a **compact, cited list** — `results: [{ title, url, published, snippet }]`. The tool
   returns snippets, never whole pages (token economy).
3. **Summarize for the owner in their language and cite the urls.** Say plainly it was a one-off
   search — nothing was built or scheduled.

## The provider key (EXA_API_KEY)

Backed by **exa.ai**. The key is a normal integration env — `EXA_API_KEY` — provisioned via the
missing-keys modal / `persist-env-var-with-rebuild`, never hardcoded. (This is NOT an AI-platform
key: the "subscription only, no API" rule is about the 5 coding platforms, not a search service.)
If the key is absent or invalid the tool returns `needs_key` with a calm message — that is **not a
platform fault**, just an un-provisioned integration. Relay it plainly and offer to add the key.

## Deeper than a search: research

For a multi-source write-up that is also saved to Company Memory, use the **`research`** skill — it
composes this search with a summary and a memory write. `web-search` is the raw search underneath;
`research` is the composed one-off. Pick `web-search` for a quick lookup, `research` for a gathered
answer worth keeping.

## Without the bridge (lone CLI)

If you are a coding agent with your own web-access tool, you may use it directly for a one-off
lookup — the principle is the same: it is a one-off action, you build nothing. The MCP tool
standardizes the ability and its token-lean result shape across all agents; the bridge is the shared
path, exa.ai the shared provider.
