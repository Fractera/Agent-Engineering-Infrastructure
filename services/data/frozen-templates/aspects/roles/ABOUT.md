# Aspect: roles

Access control for a composed group (Slot B), injected into the group's `layout.tsx`.

- Default is **public** (no guard).
- Turning roles on wraps the layout in the **shared client guard**
  `lib/auth-guard/route-guard.client.tsx` (kept in the engine, static-first preserved).
- Shapes: `public+guest` (anon → guest) · `private` (one/several/all roles) · with a
  `unauthorizedRedirect` fallback. Roles vocabulary: `lib/roles.ts` (`ALL_ROLES`).
- Server-hide (truly hidden, architect-only, makes the group dynamic) is the platform
  `@/lib/auth/require-admin` — documented in the layout, not injected by the composer.

Recipe: `HOW-USE-AUTH.md`.
