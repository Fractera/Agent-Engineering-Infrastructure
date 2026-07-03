// Service pages layout — the admin-only workspace introspection pages moved out of
// the slot in step 170 (Architecture, AI Core, Development steps, Patterns, Glossary,
// Documents, AI Draft Settings, Debug). This layout owns NO <html>/<body> (the admin
// root layout does) and mounts NO <Toaster/> (already mounted at the root). It exists
// so the /service subtree can carry its own shared chrome later without touching the
// admin shell. Access is enforced by proxy.ts (architect-only in Secure mode, open in
// IP mode) — no per-page guard needed.

export default function ServiceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
