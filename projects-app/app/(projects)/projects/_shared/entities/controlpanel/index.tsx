"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Rocket } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUiLang } from "../../use-ui-lang";
import { activationStrings } from "../../activation-i18n";
import { automationMenuStrings } from "../../automation-menu-i18n";
import { useEntitiesLive } from "../../use-entities-live";
import { resolveLocalized } from "../../localized-text";
import type { ActivationSchema } from "../../activation";
import { FrozenTemplateNotice } from "../../components/automation-accordions.client";
import { StreamAskConsole } from "./view/console";
import { DesignEmptyState, InstancedForkManager } from "./admin/chrome";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3 — breaking this breaks the whole chain, FORBIDDEN):
// the CONTAINER is the ONLY place view and admin compose. Never move admin chrome into view files, never
// import another entity. Enforced by `npm run check:entity-imports`.
//
// THE CONTROL PANEL ENTITY CONTAINER (step 254.3) — the launch console (`controlpanel`), full-width above
// the diagram. TWO compositions of the step-196 gateway planes:
//   mode="view"  — the INTERACTION plane only: a stream automation's one-shot ask console (what a public
//                  visitor uses). An undesigned or instanced automation shows nothing in view mode for now
//                  (the public fate of instanced runs is decided with the public surface, sub-step 254.12).
//   mode="admin" — the full cockpit: the design empty-state + Quiz when not designed; the ask console +
//                  demo notice for stream; the fork manager for instanced.
// The owner's visibility switch (step 237) is honored in BOTH modes — hiding the panel hides it everywhere.
export type ControlPanelMode = "view" | "admin";

function ControlPanelCard({ label, tooltip, mode, children }: { label: string; tooltip: string; mode: ControlPanelMode; children: ReactNode }) {
  return (
    <section className="mx-auto w-[85vw] max-w-full px-4 py-6" data-entity-mode={mode} data-entity-section="controlpanel">
      <TooltipProvider delayDuration={200}>
        <Accordion type="single" collapsible defaultValue="controlpanel" className="rounded-lg border px-4">
          <AccordionItem value="controlpanel" className="border-none">
            <AccordionTrigger className="text-left">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="font-medium">{label}</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
              </Tooltip>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">{children}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </TooltipProvider>
    </section>
  );
}

/** SSR seed (ROUTE-V3 law 1): the route's OWN declarations, passed by its server component — the panel
 *  renders on the server immediately; the API fetch below only refreshes/corrects after mount. Without a
 *  seed the panel is client-only (the old ActivationLayer behavior — kept for the compat wrapper). */
export type ControlPanelInitial = { schema: ActivationSchema; designed: boolean; type: string };

export function ControlPanelEntity({ automation, mode, initial }: { automation: string; mode: ControlPanelMode; initial?: ControlPanelInitial }) {
  const lang = useUiLang();
  const L = activationStrings(lang);
  const M = automationMenuStrings(lang);
  // The `controlpanel` visibility toggle (owner, 2026-07-15) — default ON; flipping it off from the
  // hamburger menu hides the panel live (the shared entities event), no rebuild.
  const { entities } = useEntitiesLive(automation, { controlpanel: true });
  const controlPanelOn = entities.controlpanel !== false;
  const [schema, setSchema] = useState<ActivationSchema | null>(initial?.schema ?? null);
  const [designed, setDesigned] = useState(initial?.designed ?? false);
  const [type, setType] = useState<string>(initial?.type ?? "");
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const r = await fetch(`/api/projects/activation?automation=${encodeURIComponent(automation)}`, { cache: "no-store" });
      if (r.ok && alive) {
        const d = (await r.json()) as { designed: boolean; schema: ActivationSchema; type: string };
        setSchema(d.schema);
        setDesigned(d.designed);
        // The launch console exists for `instanced` AND `stream` — NOT for `chained` (a group has no run
        // of its own). This container sees every automation, so it decides from the declared type.
        setType(d.type);
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [automation]);

  if (!controlPanelOn) return null;
  if (loading || (type !== "instanced" && type !== "stream")) return null;

  const cardLabel = M.entities.controlpanel.label;
  const cardTooltip = M.entities.controlpanel.tooltip;

  // NOT DESIGNED — an admin concern: the owner designs it (step 239). A visitor sees nothing yet.
  if (!designed) {
    if (mode === "view") return null;
    return (
      <ControlPanelCard label={cardLabel} tooltip={cardTooltip} mode={mode}>
        <DesignEmptyState automation={automation} />
      </ControlPanelCard>
    );
  }

  if (type === "stream") {
    return (
      <ControlPanelCard label={cardLabel} tooltip={cardTooltip} mode={mode}>
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Rocket className="size-5" /> {resolveLocalized(schema?.title, lang) || L.layerTitle}
          </h2>
          <p className="text-sm text-muted-foreground">{resolveLocalized(schema?.description, lang) || L.layerSubtitle}</p>
        </div>
        {mode === "admin" && <FrozenTemplateNotice text={M.frozenTemplateNotice} automation={automation} />}
        {schema && <StreamAskConsole automation={automation} schema={schema} />}
      </ControlPanelCard>
    );
  }

  // INSTANCED — fork management is the ADMIN plane; its public fate is decided in 254.12.
  if (mode === "view") return null;
  return (
    <ControlPanelCard label={cardLabel} tooltip={cardTooltip} mode={mode}>
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          {resolveLocalized(schema?.title, lang) || L.layerTitle}
        </h2>
        <p className="text-sm text-muted-foreground">{resolveLocalized(schema?.description, lang) || L.layerSubtitle}</p>
      </div>
      <FrozenTemplateNotice text={M.frozenTemplateNotice} automation={automation} />
      {schema && <InstancedForkManager automation={automation} schema={schema} />}
    </ControlPanelCard>
  );
}
