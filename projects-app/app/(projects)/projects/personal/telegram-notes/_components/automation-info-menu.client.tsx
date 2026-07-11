"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAutomationStatus } from "../_lib/automation-status";
import { ActivateConfirmModal } from "./activate-confirm-modal.client";

// FROZEN STANDARD — the automation menu (step 219). A hamburger opens a shadcn DropdownMenu.
//
// AUTOMATION-AGNOSTIC BY CONTRACT (owner, step 219): this menu must render identically for ANY
// automation — Telegram, YouTube, email, anything we cannot foresee. So it carries ONLY facts
// every automation has: the AI provider and the AI model, then Activate/Deactivate. Anything
// channel-specific (a Telegram bot name, a YouTube handle, …) deliberately does NOT belong here —
// channels are declared per-automation as INPUT CHANNELS (_data/channels.ts) and rendered in the
// page body, because a frozen menu cannot possibly predict every future channel.
export function AutomationInfoMenu({
  category,
  slug,
  modelEnvKey,
  defaultModel,
}: {
  category: string;
  slug: string;
  modelEnvKey: string;
  defaultModel: string;
}) {
  const status = useAutomationStatus();
  const [model, setModel] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/project-config/env?keys=${modelEnvKey}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { values?: Record<string, string> } | null) => {
        const v = d?.values?.[modelEnvKey];
        if (!cancelled) setModel(typeof v === "string" && v ? v : null);
      })
      .catch(() => { if (!cancelled) setModel(null); });
    return () => { cancelled = true; };
  }, [modelEnvKey]);

  const enabled = status.loaded ? status.enabled : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" aria-label="Automation menu">
            <Menu className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Automation</DropdownMenuLabel>
          {/* Constant, not fabricated: one global OpenAI key powers every automation today
              (step 208 unification) — there is no per-automation provider switch to read. */}
          <div className="flex items-center justify-between gap-4 px-2 py-1.5 text-sm">
            <span className="text-muted-foreground">AI provider</span>
            <span className="font-medium">OpenAI API</span>
          </div>
          <div className="flex items-center justify-between gap-4 px-2 py-1.5 text-sm">
            <span className="text-muted-foreground">AI model</span>
            <span
              className="max-w-[28ch] truncate whitespace-nowrap font-medium"
              title={model ?? defaultModel}
            >
              {model ?? defaultModel}
            </span>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={enabled === null}
            variant={enabled ? "destructive" : "default"}
            onSelect={(e) => {
              e.preventDefault(); // keep the dialog mounted when the menu closes
              setConfirmOpen(true);
            }}
          >
            {enabled ? "Deactivate automation" : "Activate automation"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ActivateConfirmModal
        category={category}
        slug={slug}
        enabled={Boolean(enabled)}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
      />
    </>
  );
}
