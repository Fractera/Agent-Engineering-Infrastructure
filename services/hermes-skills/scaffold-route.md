# scaffold-route

Turn a declared route into the standard shell-component skeleton (page.tsx +
_components/index.tsx + a leaf + a full RouteMeta _meta.ts) deterministically,
with the access shape baked in — instead of hand-typing the convention and
drifting from `CRUD-DOCS/workspace-standards/shell-component-architecture.md`.

## When to use

- A declared `/architecture` node (a `README.md` with no built file) must become
  a live page or endpoint (§6.4 declared→live).
- Any new page or endpoint is starting and you want the standard skeleton correct
  on the first try.

## Your role here (Hermes orchestrates, the coding agent emits)

You do not run the emitter yourself — you delegate it to a coding agent that owns
a terminal in the slot. Pick the agent with `owner_coding_agents_check_readiness`
+ the `choose-agent` skill, then send the task with `owner_delegate_task_to_platform`
(or `owner_coding_platform_send_prompt`). The agent runs the project-local skill.

## Before delegating — decide the access shape (required, §6.3 / HOW-USE-AUTH.md)

- `public` — anyone, no session.
- `private` — only listed roles (`--roles user,architect`); default `user`.
- `guest` — public, but an anonymous visitor becomes a real guest
  (`requiresGuestRegistration`).

## The command the coding agent runs

```bash
node .agents/skills/scaffold-route/scaffold-route.mjs \
  --path <route> --access <public|private|guest> [--roles a,b] [--kind page|api] [--force]
```

It emits a thin `page.tsx`, the `_components/index.tsx` entry, one leaf
(`.client.tsx` | `.server.tsx`), and a full `_meta.ts` (`status: "wip"`, access
wired from `--access`). API routes emit `route.ts` + `_meta.ts` only. It refuses
to overwrite an existing route dir without `--force` and never writes outside the
target root.

## After scaffolding

1. The agent fills the leaf and the entry's server-side data loading.
2. Flip `status` `wip → live` in `_meta.ts` and clear the declared `README.md`.
3. The `/architecture` scanner cross-checks `_meta.ts` against the code and flags drift.

## Source of truth (do not duplicate)

The standard is `lib/architecture/route-meta.ts` (the `RouteMeta` type, compiler-
enforced) and `shell-component-architecture.md` (the prose convention). This skill
*applies* them — if the standard changes, update the emitter, not a parallel doc.

This is a self-sufficient project skill: it is the same `scaffold-route` shipped to
every coding agent (`.agents/skills` + `.claude/.gemini/.qwen/skills`). It does not
depend on you existing — any single agent in the project can run it on its own.
