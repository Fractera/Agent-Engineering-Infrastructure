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
import type { InputChannel } from "../channels";
import type { Probe } from "../tests";
import { AutomationSettingsModal } from "./automation-settings-modal.client";
import { TestsModal } from "./tests-modal.client";

// FROZEN STANDARD (step 220) — the generic automation menu a project is BORN with. A hamburger opens a
// shadcn DropdownMenu: the AI provider + model (facts every automation has), then Settings and Tests —
// both declaration-driven (channels from _data/channels.ts, probes from _data/tests.ts). Activate /
// status are NOT here: they need a run backend the fresh skeleton does not have yet; a mature automation
// (telegram-notes) carries its own richer menu once it does.
export function AutomationMenu({
  modelEnvKey,
  defaultModel,
  channels,
  probes,
}: {
  modelEnvKey: string;
  defaultModel: string;
  channels: InputChannel[];
  probes: Probe[];
}) {
  const [model, setModel] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [testsOpen, setTestsOpen] = useState(false);

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
          <div className="flex items-center justify-between gap-4 px-2 py-1.5 text-sm">
            <span className="text-muted-foreground">AI provider</span>
            <span className="font-medium">OpenAI API</span>
          </div>
          <div className="flex items-center justify-between gap-4 px-2 py-1.5 text-sm">
            <span className="text-muted-foreground">AI model</span>
            <span className="max-w-[28ch] truncate whitespace-nowrap font-medium" title={model ?? defaultModel}>
              {model ?? defaultModel}
            </span>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSettingsOpen(true); }}>
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTestsOpen(true); }}>
            Tests
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AutomationSettingsModal
        modelEnvKey={modelEnvKey}
        defaultModel={defaultModel}
        channels={channels}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
      <TestsModal probes={probes} open={testsOpen} onOpenChange={setTestsOpen} />
    </>
  );
}
