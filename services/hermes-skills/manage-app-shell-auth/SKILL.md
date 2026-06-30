---
name: manage-app-shell-auth
description: >
  Enable or disable the PUBLIC auth control of the app shell — the Sign in / account button
  in the header and the signed-in visitor's account drawer. Use when the owner says "add
  login", "add auth", "I want a personal cabinet / my account", "let users sign up", or when
  you are building an app that NEEDS visitor accounts (a store, a social app, a SaaS
  dashboard) — and when the owner says "remove login". It is a BUILD-TIME toggle
  (NEXT_PUBLIC_APP_SHELL_AUTH = left | right | off) written through a validated setter; a
  change applies after a REBUILD. Self-sufficient: the setter is registered in every agent's
  MCP client — no Hermes required. The admin login always exists separately; this governs
  only what your visitors see.
---

# manage-app-shell-auth

Turn the deployed app's **public login** on or off. This is the agent-facing side of Admin →
**App Settings → App authorization**: the same toggle, settable by you on the owner's behalf.

## What it controls

When ON, the header gains a control that reads the visitor's identity:
- a guest sees **Sign in** (opens the existing auth flow);
- a signed-in visitor sees their **account** button → a full-height **account drawer** (sign
  out + their email + roles; future account links live there).

When OFF (the default), none of this ships — no account button, smaller bundle, faster
deploy. A landing page or portfolio needs no login, so it stays off until asked for.

**The admin login (how the owner manages the app) is a separate, always-present layer — this
toggle never touches it.** You are only ever turning the *public, visitor-facing* login on/off.

## The states

`NEXT_PUBLIC_APP_SHELL_AUTH` — one build-time env key, three states:
- **off** (absent/empty) → no public auth (default).
- **left** → public auth ON, account drawer slides in from the **left**.
- **right** → public auth ON, account drawer slides in from the **right**.

## When to enable (and the auto-rule)

Enable it when the app genuinely needs **visitor accounts**: a store (checkout, orders), a
social app, a SaaS dashboard, anything where people log in. Leave it **off** for static
brochure-style sites.

**Auto-rule (do not skip):** if the owner asks you to build something that inherently
requires accounts ("make me an online store", "build a social app"), enabling app-shell auth
is part of that job — add it to your plan **without making the owner ask separately**. The
ONLY thing you ask is the **drawer side (left or right)**. This is also written into the root
agent instructions (§5 Authorization) so every agent, including a lone one, applies it.

## Confirm before writing (mandatory)

Restate the change and wait for explicit confirmation, e.g.:
> To confirm: I'll enable the public login, with the account drawer on the **right**, and the
> app will rebuild (a few minutes) to apply it. Go ahead?

Never flip it silently.

## Reading the current state

- MCP `owner_app_settings_get_app_shell_auth` → `{ value: "left" | "right" | "off" }`.
- No MCP present? Read `app/.env.local` and look for `NEXT_PUBLIC_APP_SHELL_AUTH` — reading is safe.

## Writing — the setter (THE write path, in every agent)

The validated setter reaches you as the `app-settings-bridge` MCP server (**:3218, owner
tier**), registered in **every** agent's MCP client — not only Hermes — so a lone agent has
it too (self-sufficiency).

- `owner_app_settings_set_app_shell_auth` `{ value }` where `value` ∈ `"left" | "right" | "off"`.
  Validated, atomic, returns `rebuild_required: true` and starts the rebuild when a deploy
  secret is present.

If the bridge is unreachable but the Shell/Admin is running, the same validated path is the
HTTP route: `POST /api/config/auth-shell` `{ "value": "left" }` (writes the env key + triggers
the rebuild). Prefer it over editing files.

## Last resort only — raw env edit (when NO setter exists)

Only if there is genuinely no `app-settings-bridge` AND no config API:
1. In `app/.env.local`, upsert `NEXT_PUBLIC_APP_SHELL_AUTH=left` (or `right`), or **remove the
   line** for off. Preserve every other line.
2. Trigger a rebuild — it is build-time; nothing changes until the app is rebuilt.

## After changing

Report, and always note the rebuild, e.g.:
> Public login is ON, account drawer on the right. Applying now — it appears after the rebuild
> (a few minutes).
