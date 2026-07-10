"use client";

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

// Projects-zone footer (step 207.10 item 3) — the same footer the in-automation pages carry (brand +
// deep-link icon actions + day/night toggle), lifted to the category hub so the home matches the
// project pages exactly. The admin base is derived from window.location (adminBase) so IP and domain
// (Secure) modes work with one build; anchors stay inert until mount to avoid a hydration mismatch.
const THEME_LABELS = { system: "System theme", light: "Light theme", dark: "Dark theme" };

export function ProjectsZoneFooter({ shortName }: { shortName: string }) {
  const [admin, setAdmin] = useState("");
  useEffect(() => {
    setAdmin(adminBase());
  }, []);

  const architectureHref = admin ? `${admin}/service/architecture` : undefined;
  const stepsHref = admin ? `${admin}/service/development-steps` : undefined;
  const envHref = admin ? `${admin}/?panel=env` : undefined;

  return (
    <footer className="mt-4 flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
      <span className="font-medium">{shortName}</span>
      <TooltipProvider>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={architectureHref}
                className="flex size-8 items-center justify-center rounded-md hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Architecture"
              >
                <Settings2 className="size-4" />
              </a>
            </TooltipTrigger>
            <TooltipContent>Architecture</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={stepsHref}
                className="flex size-8 items-center justify-center rounded-md hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Development steps"
              >
                <LayoutGrid className="size-4" />
              </a>
            </TooltipTrigger>
            <TooltipContent>Development steps</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={envHref}
                className="flex size-8 items-center justify-center rounded-md hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Environment keys"
              >
                <KeyRound className="size-4" />
              </a>
            </TooltipTrigger>
            <TooltipContent>Environment keys</TooltipContent>
          </Tooltip>
          <ThemeToggle labels={THEME_LABELS} />
        </div>
      </TooltipProvider>
    </footer>
  );
}
