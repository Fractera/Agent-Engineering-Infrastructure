"use client";

import { useEffect, useState } from "react";
import { SquarePen, KeyRound } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { adminBase } from "@/lib/runtime-urls";
import { REQUIRED_ENV_KEYS } from "../_data/required-keys";

// Per-project footer (step 186.2): brand on the left, two deep-link icon actions on
// the right. The admin base is derived from window.location (adminBase) so both IP and
// domain (Secure) modes work with one build — computed after mount to avoid a
// hydration mismatch (the anchors stay inert until then). The env link pre-focuses the
// first declared key so the admin env editor lands on the field to fill (186.6).
const FOCUS_KEY = REQUIRED_ENV_KEYS[0];

export function ProjectFooter({ shortName }: { shortName: string }) {
  const [admin, setAdmin] = useState("");
  useEffect(() => {
    setAdmin(adminBase());
  }, []);

  const continueHref = admin
    ? `${admin}/service/architecture?project={{CATEGORY}}/{{PROJECT}}`
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
                aria-label="Continue development"
              >
                <SquarePen className="size-4" />
              </a>
            </TooltipTrigger>
            <TooltipContent>Continue development</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={envHref}
                className="flex size-8 items-center justify-center rounded-md hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Environment variables"
              >
                <KeyRound className="size-4" />
              </a>
            </TooltipTrigger>
            <TooltipContent>Environment variables</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </footer>
  );
}
