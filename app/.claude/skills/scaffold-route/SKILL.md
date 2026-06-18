---
name: scaffold-route
description: Materialize a declared route into the standard shell-component skeleton (page.tsx + _components/index.tsx + a leaf + a full RouteMeta _meta.ts) by construction, with the access shape baked in. Use when turning a declared /architecture node (README.md, no built file) into a live page/endpoint, or when starting any new route — instead of hand-typing the convention.
---

# scaffold-route

Emits the route skeleton **deterministically** so you never hand-type (and drift
from) `CRUD-DOCS/workspace-standards/shell-component-architecture.md`. The
~50-field `RouteMeta` and the thin-page / entry / leaf-suffix convention are
encoded once in the script — you do not reproduce them from memory.

## When to use
- A declared `/architecture` node (a `README.md` with no built file) needs to become live (§6.4 declared→live).
- You are creating any new page or endpoint and want the standard skeleton, correct on the first try.

## Before running — decide the access shape (required, §6.3 / HOW-USE-AUTH.md)
- `public` — anyone, no session.
- `private` — only listed roles (`--roles user,architect`); default `user`.
- `guest` — public, but an anonymous visitor becomes a real guest (`requiresGuestRegistration`).

## Run
```bash
node .claude/skills/scaffold-route/scaffold-route.mjs --path <route> --access <public|private|guest> [--roles a,b] [--kind page|api] [--force]
```
Examples:
```bash
node .claude/skills/scaffold-route/scaffold-route.mjs --path /feed --access private --roles user
node .claude/skills/scaffold-route/scaffold-route.mjs --path "/post/[id]" --access guest
node .claude/skills/scaffold-route/scaffold-route.mjs --path /api/posts --access private --kind api
```

## What it emits (under `app/app/[lang]/<route>/`)
- `page.tsx` — thin Server Component (renders the entry, never `"use client"`).
- `_components/index.tsx` — the entry (server by default).
- `_components/<name>.client.tsx` | `.server.tsx` — one leaf with a matching directive.
- `_meta.ts` — the full `RouteMeta` (every key present), `status: "wip"`, access wired from `--access`.
- API routes emit `route.ts` + `_meta.ts` only.

It refuses to overwrite an existing route dir unless `--force`, and never writes outside the target root.

## After scaffolding
1. Fill the leaf and the entry's server-side data loading.
2. Flip `status` `wip → live` in `_meta.ts` and clear the declared `README.md` (declared→live).
3. The `/architecture` scanner cross-checks `_meta.ts` against the code and flags drift.

## Source of truth (do not duplicate)
The standard is `@/lib/architecture/route-meta.ts` (the `RouteMeta` type, compiler-enforced) and
`shell-component-architecture.md` (the prose convention). This skill *applies* them; it is not a second
copy of the standard — if the standard changes, update the emitter, not a parallel doc.
