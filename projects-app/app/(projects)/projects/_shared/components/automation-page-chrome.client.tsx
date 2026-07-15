"use client";

import { usePathname } from "next/navigation";
import { WaveLockProvider } from "./wave-lock.client";

// THE AUTOMATION PAGE'S CHROME (step 241 E3.1; reordering fix step 243.1) — mounted ONCE, in the
// projects-zone layout.
//
// WHAT THIS PROVIDES: only the `WaveLockProvider` CONTEXT (one poll for the whole page — the wave banner's
// state, every tool's lock, all agree because they share this one provider). It renders NO visual chrome of
// its own any more.
//
// WHY NOT THE BANNER/CONSOLE TOO (reversed from the original E3.1 fix, step 243.1): the owner required a
// SPECIFIC on-page order — status bar (breadcrumb/indicator/menu) FIRST, then the notification banner, THEN
// the title. The banner and the launch console both need to sit BETWEEN the status bar and the title, and
// the status bar is per-project generated content (it needs that project's OWN channels/probes/entities,
// not fetchable generically) — so the ONLY place that ordering can be expressed is the per-project
// `_components/index.tsx` template (frozen-project-starter.ts SKELETON), not this shared layout. Every
// automation's own `_components/index.tsx` now renders `<DevelopmentWaveBanner>` and `<ActivationLayer>`
// itself, right after its `<AutomationStatusBar>` — the SKELETON template does this for every future
// automation, and every existing automation was migrated once (step 243.1) so none lost the banner.
//
// It renders nothing on the hubs (/projects, /projects/<category>) — only on an automation's own page.

/** The automation this page belongs to, or null on a hub. Segments after the zone root: exactly two. */
function automationFromPath(pathname: string): string | null {
  const parts = pathname.split("?")[0].split("#")[0].split("/").filter(Boolean);
  // ["projects", "<category>", "<slug>"] — anything shorter is a hub, anything longer is a sub-page.
  if (parts.length !== 3 || parts[0] !== "projects") return null;
  return `${parts[1]}/${parts[2]}`;
}

export function AutomationPageChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const automation = automationFromPath(pathname);

  if (!automation) return <>{children}</>;

  return (
    <WaveLockProvider automation={automation}>
      {children}
    </WaveLockProvider>
  );
}
