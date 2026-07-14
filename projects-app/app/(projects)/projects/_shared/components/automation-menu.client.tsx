"use client";

import { useEffect, useState } from "react";
import { Menu, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import type { EntitiesConfig, EntityKey } from "../entities";
import { ENTITY_ORDER } from "../entities";
import { AutomationSettingsModal } from "./automation-settings-modal.client";
import { TestsModal } from "./tests-modal.client";
import { DeleteAutomationModal } from "./delete-automation-modal.client";
import { HowItWorksModal } from "./how-it-works-modal.client";
import { useUiLang } from "../use-ui-lang";
import { automationMenuStrings } from "../automation-menu-i18n";
import { useCasesStrings } from "../use-cases-i18n";
import { useEntitiesLive } from "../use-entities-live";

// FROZEN STANDARD (step 220; extended 237) — the generic automation menu a project is BORN with. A
// hamburger opens a shadcn DropdownMenu: "How it works" (AI-written plain description, top) · the AI
// provider + model (facts every automation has) · Settings · the entity visibility switches (Diagram/
// Calendar/Map/Dashboard/Processes/Analytics/User cases — instant, no rebuild, see `use-entities-live.ts`)
// · Tests. Activate / status are NOT here: they need a run backend the fresh skeleton does not have yet;
// a mature automation (telegram-notes) carries its own richer menu once it does.
export function AutomationMenu({
  modelEnvKey,
  defaultModel,
  channels,
  probes,
  automation,
  entitiesSeed,
}: {
  modelEnvKey: string;
  defaultModel: string;
  channels: InputChannel[];
  probes: Probe[];
  /** "category/slug" — scopes the live entities store + the How it works description. */
  automation?: string;
  /** The project's _data/config.ts entities — the seed the live switches start from. */
  entitiesSeed?: Partial<EntitiesConfig>;
}) {
  const lang = useUiLang();
  const M = automationMenuStrings(lang);
  const U = useCasesStrings(lang);
  const [model, setModel] = useState<string | null>(null);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [testsOpen, setTestsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { entities, setEntity } = useEntitiesLive(automation, entitiesSeed ?? {});

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

  const entityLabel = (k: EntityKey) => (k === "usecases" ? U.sectionTitle : M.entities[k].label);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" aria-label="Automation menu">
            <Menu className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setHowItWorksOpen(true); }} className="gap-2 font-medium">
            <Sparkles className="size-4" />
            {M.howItWorks}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{M.automationLabel}</DropdownMenuLabel>
          <div className="flex items-center justify-between gap-4 px-2 py-1.5 text-sm">
            <span className="text-muted-foreground">{M.aiProvider}</span>
            <span className="font-medium">OpenAI API</span>
          </div>
          <div className="flex items-center justify-between gap-4 px-2 py-1.5 text-sm">
            <span className="text-muted-foreground">{M.aiModel}</span>
            <span className="max-w-[28ch] truncate whitespace-nowrap font-medium" title={model ?? defaultModel}>
              {model ?? defaultModel}
            </span>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSettingsOpen(true); }}>
            {M.settingsItem}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{M.entitiesHeading}</DropdownMenuLabel>
          {ENTITY_ORDER.map((k) => (
            <div key={k} className="flex items-center justify-between gap-4 px-2 py-1.5 text-sm">
              <span>{entityLabel(k)}</span>
              <Switch
                checked={Boolean(entities[k])}
                onCheckedChange={(v) => setEntity(k, v)}
                aria-label={entityLabel(k)}
              />
            </div>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTestsOpen(true); }}>
            {M.testsItem}
          </DropdownMenuItem>
          {/* DANGER ZONE (step 241 E3.2, owner's request) — the LAST item, visually separated and destructive.
              Until now an automation could be created but never removed, so every test and abandoned idea
              stayed forever. Deleting is irreversible, so it never happens from this click: it opens a modal
              that requires the automation's own name to be typed. */}
          {automation && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-normal text-rose-600 dark:text-rose-400">
                {M.dangerZone}
              </DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={(e) => { e.preventDefault(); setDeleteOpen(true); }}
                className="gap-2 text-rose-600 focus:text-rose-600 dark:text-rose-400"
              >
                <Trash2 className="size-4" /> {M.deleteAutomation}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {automation && (
        <DeleteAutomationModal automation={automation} open={deleteOpen} onOpenChange={setDeleteOpen} />
      )}
      <HowItWorksModal automation={automation} open={howItWorksOpen} onOpenChange={setHowItWorksOpen} />
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
