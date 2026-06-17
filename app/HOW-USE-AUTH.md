# HOW-USE-AUTH.md — wiring a page for public / private / guest access

This is the practical recipe an agent follows when creating or editing a page in `app/`. It answers one
question: **"who is allowed on this page, and what happens to an unauthenticated visitor?"**

There are exactly three access shapes. Pick one per route.

| Shape | Who gets in | What an unauthenticated visitor sees |
|---|---|---|
| **Public** | everyone, no session needed | the page (no gating) |
| **Private** | only listed roles | redirected to sign in |
| **Public + guest** | everyone, but anonymous visitors are upgraded to a **guest** | a real guest identity is created so their work persists |

> Platform boundary: the **auth service** (`services/auth`) provides the guest sign-in endpoint
> (`/api/auth/guest`) and the guest→full **promotion** (register updates the same row). Those are platform
> code outside `app/` — you do not edit them. Your job in `app/` is to **declare** the access shape and
> **trigger** the guest sign-in on the right pages, then write data against the session identity.

---

## 1. Declare the access shape in `_meta.ts`

Every route has a typed `_meta.ts` (`satisfies RouteMeta`). Use these fields:

```ts
// app/app/<route>/_meta.ts
export const meta = {
  // ...identity/seo/etc...

  // PUBLIC: leave roles empty / omit the gate.
  roles: [],                         // no role requirement

  // PRIVATE: list the roles allowed. Anyone else is redirected.
  // roles: ['user', 'architect'],
  // unauthorizedRedirect: '/register?requireRole=user',

  // PUBLIC + GUEST: the page is open to all, but an anonymous visitor
  // must be turned into a guest so their work (cart, chat…) is saved.
  requiresGuestRegistration: true,
} satisfies RouteMeta
```

- **Public** → `roles: []`, no `requiresGuestRegistration`.
- **Private** → `roles: ['<role>', …]` (+ optional `unauthorizedRedirect`). Roles come from the project
  role model (`guest | user | architect` plus the business roles; see `CRUD-DOCS/auth-architecture.md`).
- **Public + guest** → `requiresGuestRegistration: true` (you may still leave `roles: []` — guests are
  allowed; the flag only forces "anonymous → guest").

---

## 2. Enforce it client-side (static-first — never `auth()` in a page)

Per the STATIC-FIRST rules (`AGENTS.md` §12a), do **not** call `auth()`/`cookies()`/`headers()` in a
layout or page — it breaks static generation. Read identity in a **client component** via `/api/me` and
act on the route's meta. Use the shared hook:

```tsx
'use client'
import { useRouteAccess } from '@/lib/hooks/use-route-access'
import { meta } from '../_meta'

export function GuardedView() {
  // Reads /api/me, then: if requiresGuestRegistration && no session → triggers guest sign-in;
  // if roles[] set && the user lacks them → redirects to the unauthorizedRedirect.
  useRouteAccess(meta)
  return /* …page content… */
}
```

**The hook already ships in this app** at `app/lib/hooks/use-route-access.ts` — you do **not** write it,
just `import { useRouteAccess }` and mount it (as above). For reference, it: fetches `/api/me`; if
`requiresGuestRegistration` and there is no session, hard-navigates to `/api/auth/guest?redirectUrl=…`
(creating the guest); if `roles[]` is set and the visitor lacks them, sends them to `unauthorizedRedirect`
(or the register form via `registerRedirectUrl`); otherwise it does nothing. The `requiresGuestRegistration`
flag on `RouteMeta` and the guest→full **promotion** in the auth service also already ship — so activating
guest auth on a page is exactly the two steps in §1 and §2, nothing more to build.

`/api/auth/guest` is a **hard navigation** (not `fetch`) — it sets the session cookie and redirects back
to `redirectUrl`. After it returns, the visitor has a real `guest` session.

---

## 3. Write the visitor's data against their identity

Once a guest (or any user) has a session, store their cart / messages / drafts against **their
identity**, never in localStorage-only. Use the project's data layer with the agent-identity header so
rows carry the owning user:

```ts
await fetch('/api/project/default/<resource>', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ /* …the cart line / message… */ }),
})
// The server stamps the row with the current session's user.id (the data-scoping the app already uses).
```

Because the guest's `user.id` is **permanent**, every row stays addressable by that id.

---

## 4. Promotion to a full account (platform-provided — know how it behaves)

When the guest later signs up, the platform's `register()` **updates the same `users` row** (adds
`email` + `password`, switches `roles` to `['user']`), keeping `user.id`. So **all the data the guest
produced stays attached** — no migration, nothing to re-link. You do not implement this in `app/`; just
rely on it: the visitor's cart and messages are still theirs after they register.

---

## 5. Decision checklist (use this when adding any page)

1. **Is this page public or private?**
2. If **private** → which **roles** may see it? → set `roles: [...]` in `_meta.ts`.
3. If **public**, does it let a visitor produce data worth keeping (cart, chat, draft)?
   - **No** → plain public (`roles: []`).
   - **Yes** → set `requiresGuestRegistration: true` and mount `useRouteAccess(meta)` so an anonymous
     visitor becomes a guest and their work persists.

Full conceptual background: `CRUD-DOCS/auth-architecture.md` (§3.3 and §13).
