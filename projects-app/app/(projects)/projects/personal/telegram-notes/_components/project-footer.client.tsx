"use client";

import { useEffect, useState } from "react";
import { Settings2, KeyRound } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { adminBase } from "@/lib/runtime-urls";
import { ThemeToggle } from "@/components/menu/shared/theme-toggle.client";
import { REQUIRED_ENV_KEYS } from "../_data/required-keys";
import { projectTabStrings } from "../_data/tab-i18n";

// Day/night theme labels for the footer toggle (English — the Projects zone is monolingual).
const THEME_LABELS = { system: "System theme", light: "Light theme", dark: "Dark theme" };

// Per-project footer (step 186.2): brand on the left, two deep-link icon actions on
// the right. The admin base is derived from window.location (adminBase) so both IP and
// domain (Secure) modes work with one build — computed after mount to avoid a
// hydration mismatch (the anchors stay inert until then). The env link pre-focuses the
// first declared key so the admin env editor lands on the field to fill (186.6).
const FOCUS_KEY = REQUIRED_ENV_KEYS[0];

export function ProjectFooter({ shortName, lang }: { shortName: string; lang: string }) {
  const [admin, setAdmin] = useState("");
  useEffect(() => {
    setAdmin(adminBase());
  }, []);
  const t = projectTabStrings(lang);

  const continueHref = admin
    ? `${admin}/service/architecture?project=personal/telegram-notes`
    : undefined;
  const envHref = admin
    ? `${admin}/?panel=env${FOCUS_KEY ? `&key=${encodeURIComponent(FOCUS_KEY)}` : ""}`
    : undefined;

  return (
    <footer className="mt-4 flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
      <span className="font-medium">{shortName}</span>
      <TooltipProvider>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={continueHref}
                className="flex size-8 items-center justify-center rounded-md hover:bg-muted hover:text-foreground transition-colors"
                aria-label={t.continueDev}
              >
                <Settings2 className="size-4" />
              </a>
            </TooltipTrigger>
            <TooltipContent>{t.continueDev}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={envHref}
                className="flex size-8 items-center justify-center rounded-md hover:bg-muted hover:text-foreground transition-colors"
                aria-label={t.envVars}
              >
                <KeyRound className="size-4" />
              </a>
            </TooltipTrigger>
            <TooltipContent>{t.envVars}</TooltipContent>
          </Tooltip>
          <ThemeToggle labels={THEME_LABELS} />
        </div>
      </TooltipProvider>
    </footer>
  );
}
