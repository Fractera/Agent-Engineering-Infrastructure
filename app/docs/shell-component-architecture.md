# Shell Component Architecture (step 101.A)

**Status: ACTIVE — authoritative for all work in `app/` (the Shell layer).**
Read before touching any page, route or component. The `/architecture` page is the
machine-checked mirror of these rules: it scans the code and flags every drift.

## Why this exists

A convention that is only *described* drifts on the first agent that doesn't read
it. So the pattern is enforceable, not aspirational: each rule below maps to a fact
the scanner derives from the code, and the `/architecture` detail panel surfaces any
violation as `drift`. Pattern first, documentation second.

## The route folder

Every route is a folder. Its shape is fixed:

```
app/<route>/
  page.tsx          server, thin — renders only the entry component
  _meta.ts          authored metadata (satisfies RouteMeta)
  _components/
    index.tsx       the entry component (server by default)
    *.client.tsx    interactive leaves
    *.server.tsx    server-only leaves
    types.ts        local types/data (no directive)
```

API routes use `route.ts` in place of `page.tsx` and rarely need `_components/`.
Files/folders prefixed `_` are Next.js private — excluded from routing.

## Rules

1. **`page.tsx` is a thin Server Component.** Never `"use client"`. It returns the
   entry component and nothing else — no state, no markup, no data shaping.
   *Detected:* `isClientComponent` on a page = violation.

2. **The entry is `_components/index.tsx`.** `page.tsx` imports it as `./_components`.
   Server by default; a `"use client"` entry is allowed only for instrumental pages
   (`/ai-core`, `/architecture`, `/debug`) where there is no SEO to protect.
   Server-side data loading belongs here.
   *Detected:* `entryComponent`, `entryIsClient`.

3. **Route-local components live in `_components/`.** A component used by exactly one
   route stays beside it. Don't lift to the shared folder pre-emptively.

4. **Shared components live in `app/components/`.** Promote a component there the
   moment a second route consumes it — not before.

5. **Leaf components carry a boundary suffix:** `*.client.tsx` or `*.server.tsx`.
   The suffix is a human/agent/lint convention; the real boundary is the
   `"use client"` directive — the two must agree (`.client` ⇒ directive present;
   `.server` ⇒ absent). `index.tsx` keeps its name (its boundary shows as
   `entryIsClient`).
   *Detected:* suffix/directive mismatch = drift.

6. **`app/components/ui/` is exempt.** These are vendored shadcn/ui primitives —
   keep their upstream names (no suffix) so they stay upgradable.

7. **`_meta.ts` is the typed contract.** `export default { … } satisfies RouteMeta`
   (`@/lib/architecture/route-meta`). It holds only intent the code can't express —
   purpose, visibility + roles, rendering, SEO, query-param meaning. Facts (path,
   rendering, client/server, methods) are derived by the scanner and must NOT be
   duplicated here, or they drift.

## The contract

The single source of types is `app/lib/architecture/route-meta.ts`:

- `RouteMeta` — authored (`_meta.ts`). Discriminated unions encode the rules:
  `roles` is required iff `visibility: "private"`; `revalidate` is required iff
  `rendering: "isr"`. The compiler refuses an invalid shape.
- `RouteFacts` — derived by the scanner from the code on disk.
- `RouteInfo = RouteFacts & { meta?; drift[] }` — what the panel renders.

## Example — `/dashboard` (reference refactor)

`page.tsx`
```tsx
import DashboardEntry from "./_components"
export default function Page() { return <DashboardEntry /> }
```

`_components/index.tsx`
```tsx
import { DashboardApp } from "./dashboard-app.client"
export default function DashboardEntry() { return <DashboardApp /> }
```

`_meta.ts`
```ts
import type { RouteMeta } from "@/lib/architecture/route-meta"
export default {
  description: "Product catalogue demo — DB + media upload.",
  visibility: "private",
  roles: ["user", "admin"],
  rendering: "dynamic",
  seo: { indexable: false, inSitemap: false },
} satisfies RouteMeta
```

Interactive state lives in `dashboard-app.client.tsx`; the form and table are
client leaves (`product-form.client.tsx`, `product-table.client.tsx`). The page
and the entry stay server; only the leaves that need state carry `"use client"`.
