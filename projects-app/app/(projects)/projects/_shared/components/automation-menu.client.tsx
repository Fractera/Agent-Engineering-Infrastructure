"use client";

import { useEffect, useState } from "react";
import { Menu, Sparkles, Trash2, Pencil, GripVertical } from "lucide-react";
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
import type { EntitiesConfig, OrderableKey } from "../entities";
import { AutomationSettingsModal } from "./automation-settings-modal.client";
import { TestsModal } from "./tests-modal.client";
import { DeleteAutomationModal } from "./delete-automation-modal.client";
import { RenameAutomationModal } from "./rename-automation-modal.client";
import { HowItWorksModal } from "./how-it-works-modal.client";
import { useUiLang } from "../use-ui-lang";
import { automationMenuStrings } from "../automation-menu-i18n";
import { useCasesStrings } from "../use-cases-i18n";
import { useEntitiesLive } from "../use-entities-live";
import { useEntityOrderLive } from "../use-entity-order-live";

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
  type,
}: {
  modelEnvKey: string;
  defaultModel: string;
  channels: InputChannel[];
  probes: Probe[];
  /** "category/slug" — scopes the live entities store + the How it works description. */
  automation?: string;
  /** The project's _data/config.ts entities — the seed the live switches start from. */
  entitiesSeed?: Partial<EntitiesConfig>;
  /** The automation's type — decides whether the fork-activation row appears in the sortable list (step 241:
   *  fork activation is an instanced-only section). */
  type?: "stream" | "instanced" | "chained";
}) {
  const lang = useUiLang();
  const M = automationMenuStrings(lang);
  const U = useCasesStrings(lang);
  const [model, setModel] = useState<string | null>(null);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [testsOpen, setTestsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const { entities, setEntity } = useEntitiesLive(automation, entitiesSeed ?? {});
  // The owner's dragged section order (step 241) — the same list AutomationAccordions renders in; dropping a
  // row here reorders the accordions instantly through the shared window event.
  const { order, setOrder } = useEntityOrderLive(automation);
  const [dragKey, setDragKey] = useState<OrderableKey | null>(null);
  const [overKey, setOverKey] = useState<OrderableKey | null>(null);

  // fork activation is a row ONLY for an instanced automation (it has no on/off switch — it is always present
  // for that type). Every other orderable key is always listed.
  const rows = order.filter((k) => (k === "fork-activation" ? type === "instanced" : true));

  // Move the dragged key to the dropped-on key's position and persist the whole order.
  function drop(target: OrderableKey) {
    if (!dragKey || dragKey === target) { setDragKey(null); setOverKey(null); return; }
    const next = order.filter((k) => k !== dragKey);
    const at = next.indexOf(target);
    next.splice(at < 0 ? next.length : at, 0, dragKey);
    setOrder(next);
    setDragKey(null);
    setOverKey(null);
  }

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

  // OPEN SETTINGS FROM OUTSIDE (step 248): a `missing-credentials` warning and the missing-keys funnel
  // both carry an "Open Settings" button — they dispatch this event, the menu owns the modal state.
  // The detail's automation (when given) must match ours, so two automations on one page never cross-open.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent).detail as { automation?: string } | undefined;
      if (d?.automation && automation && d.automation !== automation) return;
      setSettingsOpen(true);
    };
    window.addEventListener("automation:open-settings", onOpen);
    return () => window.removeEventListener("automation:open-settings", onOpen);
  }, [automation]);

  const rowLabel = (k: OrderableKey): string =>
    k === "fork-activation" ? M.forkActivationLabel : k === "usecases" ? U.sectionTitle : M.entities[k].label;

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
          {/* DRAG TO REORDER (step 241, owner) — a grip on the LEFT of every section. Dragging a row changes
              the ORDER of the accordions on the page (live, no rebuild). fork-activation is listed here too
              (instanced only) and has no switch — it is always present for that type. The rows are plain divs
              (not menu items), so the native drag never fights Radix's item navigation. */}
          {rows.map((k) => {
            const label = rowLabel(k);
            const reorder = M.reorderAria.replace("{name}", label);
            return (
              <div
                key={k}
                onDragOver={(e) => { e.preventDefault(); if (overKey !== k) setOverKey(k); }}
                onDrop={(e) => { e.preventDefault(); drop(k); }}
                className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
                  overKey === k && dragKey && dragKey !== k ? "bg-accent" : ""
                } ${dragKey === k ? "opacity-50" : ""}`}
              >
                <span
                  draggable
                  onDragStart={(e) => { setDragKey(k); e.dataTransfer.effectAllowed = "move"; }}
                  onDragEnd={() => { setDragKey(null); setOverKey(null); }}
                  className="cursor-grab text-muted-foreground active:cursor-grabbing"
                  aria-label={reorder}
                  title={reorder}
                >
                  <GripVertical className="size-4" />
                </span>
                <span className="flex-1 truncate">{label}</span>
                {k === "fork-activation" ? null : (
                  <Switch
                    checked={Boolean(entities[k])}
                    onCheckedChange={(v) => setEntity(k, v)}
                    aria-label={label}
                  />
                )}
              </div>
            );
          })}
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
              {/* Rename (step 241) — not destructive, so a normal item; it still opens an explicit modal
                  rather than firing from the click. */}
              <DropdownMenuItem
                onSelect={(e) => { e.preventDefault(); setRenameOpen(true); }}
                className="gap-2"
              >
                <Pencil className="size-4" /> {M.renameAutomation}
              </DropdownMenuItem>
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
        <>
          <DeleteAutomationModal automation={automation} open={deleteOpen} onOpenChange={setDeleteOpen} />
          <RenameAutomationModal automation={automation} open={renameOpen} onOpenChange={setRenameOpen} />
        </>
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
