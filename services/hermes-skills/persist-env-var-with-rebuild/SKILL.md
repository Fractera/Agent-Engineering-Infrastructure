---
name: persist-env-var-with-rebuild
description: >
  Make a BUILD-TIME environment variable survive a production redeploy. Use whenever a
  feature needs a value baked at build — any NEXT_PUBLIC_* (inlined into the browser
  bundle), the language set, Stripe keys + product ids, a custom API/DB URL, a feature
  flag, analytics IDs. Write the value into the slot's own app/.env.local through the
  proper setter, then trigger a rebuild: the slot-scoped build bakes the slot's own
  .env.local. Use when adding payments, a new integration key, a feature flag, or any
  value the app reads at build time — and to avoid the silent "saved but the app never
  sees it" bug. Self-sufficient: works for a lone agent, no Hermes required.
---

# persist-env-var-with-rebuild

Give the deployed app a build-time environment variable that actually reaches visitors,
on this redeploy and every future one. This is the agent-facing side of the
**build-time env & redeploy** standard.

Full reference: `CRUD-DOCS/workspace-standards/build-time-env-and-redeploy.md`.

## The one rule

**A build-time value changes only by a rebuild, and the rebuild bakes the slot's own
`app/.env.local`. Write the value there through the proper setter, then trigger a rebuild —
never hand-wait a restart, never make a page dynamic to "show it instantly".**

## Is your variable build-time? (decide first)

- **Build-time** (this skill): every `NEXT_PUBLIC_*` (inlined into the client bundle), and
  anything read while pages are generated — the language set, a Stripe **publishable** key,
  a feature flag, analytics IDs. Frozen at `next build`. Editing the file does nothing until
  a rebuild.
- **Runtime** (NOT this skill): read fresh per request by the server; a restart suffices.
- **App settings** (name/description/SEO/PWA/JSON-LD): those live in `app-config.json`, not
  env, and apply on the next load via revalidation — use the `manage-app-settings` skill.

## How to do it

1. **Write through the proper setter, never raw.**
   - Language set → MCP `owner_app_settings_set_languages` (or `/api/config/languages`).
   - A brand-new variable with no setter → add the line to the slot's `app/.env.local`
     (`KEY=value`, preserve all other lines, atomic write) and document it in the app.
2. **Trigger a rebuild** — this is what bakes it. The deploy pipeline `POST /api/deploy`
   (Admin :3002, with the deploy secret) rebuilds the slot and reloads it. A `pm2 restart`
   alone re-reads an already-built bundle and will NOT pick up the new value.
3. **Confirm + state the cost.** Restate the change to the owner; say a rebuild takes a few
   minutes. That is the honest price of build-time config, not a regression.

## Guarantee you can rely on (and must not break)

The slot build runs with a **slot-scoped environment**: it drops Next's cross-process
`__NEXT_PROCESSED_ENV` marker and every key the slot declares, so the child `next build`
freshly loads `app/.env.local` and the slot's own values win. Implemented in the deploy
route (`bridges/app/app/api/deploy/route.ts`, `slotBuildEnv()`). Because of it, **any** key
you declare in the slot's `.env.local` is baked correctly on redeploy — languages, Stripe,
custom vars alike. Do not spawn a slot build with a raw inherited environment; that
reintroduces the silent "saved but missing" bug.

## Do NOT

- Hand-wait a `pm2 restart` and expect a new build-time value — it won't appear.
- Reach for `force-dynamic` to "reflect a value instantly" — that breaks static-first.
  Build-time values change by rebuild; instant text uses on-demand revalidation (different
  mechanism — see `manage-app-settings` / `static-first`).
- Spawn the slot build with `{ ...process.env }` from the Admin process — keep it
  slot-scoped.

## After

Report what you set and that it applies after the rebuild, e.g.:
> Added `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to the app and triggered a rebuild — it will
> be live in a few minutes, baked into the build.
