"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Settings2, KeyRound, LayoutGrid } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { adminBase } from "@/lib/runtime-urls";
import { ThemeToggle } from "@/components/menu/shared/theme-toggle.client";
import { useUiLang } from "../projects/_shared/use-ui-lang";
import { projectsZoneFooterStrings } from "./projects-zone-footer-i18n";

// THE single Projects-zone footer (step 213). Rendered ONCE by the zone layout so every project
// page AND every hub carries the IDENTICAL footer — no page re-assembles it anymore (that was the
// only source of footer divergence). The one per-page variable — the Architecture deep-link's
// project focus — is DERIVED from the URL (usePathname), so there is zero per-page footer code and
// no _meta field to keep in sync: a project route /projects/<cat>/<slug> focuses Architecture on
// that project; a hub/index route links to Architecture generically.

// /projects/<category>/<slug> → "<category>/<slug>" ; /projects or /projects/<cat> → null.
function projectFromPath(pathname: string): string | null {
  const segs = pathname.split("/").filter(Boolean);
  if (segs[0] !== "projects") return null;
  return segs.length >= 3 ? `${segs[1]}/${segs[2]}` : null;
}

// Layout (owner): the top border spans the FULL screen width (like the header), the content sits in the
// standard 85vw column, and the bar itself is 40px tall — it used to eat a lot of vertical space.
export function ProjectsZoneFooter({ shortName }: { shortName: string }) {
  const pathname = usePathname();
  const lang = useUiLang();
  const L = projectsZoneFooterStrings(lang);
  const THEME_LABELS = { system: L.themeSystem, light: L.themeLight, dark: L.themeDark };
  const [admin, setAdmin] = useState("");
  // Admin base derived from window.location after mount (IP vs domain) — anchors stay inert until
  // then to avoid a hydration mismatch.
  useEffect(() => {
    setAdmin(adminBase());
  }, []);

  const project = projectFromPath(pathname);
  const architectureHref = admin
    ? `${admin}/service/architecture${project ? `?project=${project}` : ""}`
    : undefined;
  const stepsHref = admin ? `${admin}/service/development-steps` : undefined;
  const envHref = admin ? `${admin}/?panel=env` : undefined;

  return (
    <footer className="mt-8 w-full border-t text-sm text-muted-foreground">
      <div className="mx-auto flex h-10 w-[85vw] max-w-full items-center justify-between px-4">
      <span className="font-medium">{shortName}</span>
      <TooltipProvider>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={architectureHref}
                className="flex size-8 items-center justify-center rounded-md hover:bg-muted hover:text-foreground transition-colors"
                aria-label={L.architecture}
              >
                <Settings2 className="size-4" />
              </a>
            </TooltipTrigger>
            <TooltipContent>{project ? L.continueDevelopment : L.architecture}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={stepsHref}
                className="flex size-8 items-center justify-center rounded-md hover:bg-muted hover:text-foreground transition-colors"
                aria-label={L.developmentSteps}
              >
                <LayoutGrid className="size-4" />
              </a>
            </TooltipTrigger>
            <TooltipContent>{L.developmentSteps}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={envHref}
                className="flex size-8 items-center justify-center rounded-md hover:bg-muted hover:text-foreground transition-colors"
                aria-label={L.environmentKeys}
              >
                <KeyRound className="size-4" />
              </a>
            </TooltipTrigger>
            <TooltipContent>{L.environmentKeys}</TooltipContent>
          </Tooltip>
          <ThemeToggle labels={THEME_LABELS} />
        </div>
      </TooltipProvider>
      </div>
    </footer>
  );
}
