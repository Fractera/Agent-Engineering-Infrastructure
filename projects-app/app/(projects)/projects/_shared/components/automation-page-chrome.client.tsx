"use client";

import { usePathname } from "next/navigation";
import { WaveLockProvider } from "./wave-lock.client";
import { DevelopmentWaveBanner } from "./development-wave-banner.client";
import { ActivationLayer } from "./activation-layer.client";

// THE AUTOMATION PAGE'S CHROME (step 241 E3.1) — mounted ONCE, in the projects-zone layout.
//
// THE BUG THIS FIXES (found by the owner testing step 240, and it is a real design error, not a slip): the
// wave banner, the development lock and the activation layer were mounted in the frozen SKELETON. But a
// project's page is GENERATED CODE, written when that project was created — so only projects created AFTER
// the change would ever get them, while every automation that already exists kept an old page and showed
// nothing. The owner saved a dashboard requirement, saw it staged, and no banner appeared: the banner was
// not in his page's code at all.
//
// The fix is structural: page-level chrome belongs to the ZONE LAYOUT, which wraps EVERY automation page —
// old and new alike — so it can never drift from the generated pages again. The layout does not know which
// automation it is rendering, but the URL does: /projects/<category>/<slug> (the zone footer already derives
// it the same way).
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
      <div className="mx-auto w-[85vw] max-w-full px-4 pt-6">
        {/* The ONLY launcher of development (step 240): appears the moment anything is staged. */}
        <DevelopmentWaveBanner automation={automation} />
      </div>

      {/* The launch control panel (step 241 E3, generalized to `stream` in step 243) — renders itself only for
          an INSTANCED or STREAM automation whose activation is declared; it decides that from the
          automation's own _data/activation.ts + type. Permanent: it is not an accordion and cannot be hidden. */}
      <ActivationLayer automation={automation} />

      {children}
    </WaveLockProvider>
  );
}
