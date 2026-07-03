import { ServiceNav } from "./_components/service-nav.client"

// Service pages layout — the admin-only workspace introspection pages moved out of
// the slot in step 170 (Architecture, AI Core, Development steps, Patterns, Glossary,
// Documents, AI Draft Settings, Debug). This layout owns NO <html>/<body> (the admin
// root layout does) and mounts NO <Toaster/> (already mounted at the root). The zone
// opens in its own full browser tab (Service button in the admin header), so the
// shared chrome is a sticky nav across the 8 pages. Access is enforced by proxy.ts
// (architect-only in Secure mode, open in IP mode) — no per-page guard needed.
//
// The admin root <body> is h-screen overflow-hidden (the main workspace owns its own
// scroll), so this zone must be its own scroll container: the wrapper below restores
// vertical scrolling for the service pages while the sticky nav stays pinned to the
// top of the container (= top of the viewport).

export default function ServiceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-y-auto">
      <ServiceNav />
      {children}
    </div>
  )
}
