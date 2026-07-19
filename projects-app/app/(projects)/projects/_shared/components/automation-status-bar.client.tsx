"use client";

import Link from "next/link";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InputChannel } from "../channels";
import type { Probe } from "../tests";
import type { AutomationType } from "../automation-type";
import type { EntitiesConfig } from "../entities";
import { AutomationMenu } from "./automation-menu.client";
import { SparklesComment } from "./sparkles-comment.client";
import { AutomationStatePill } from "./automation-state-pill.client";
import { AutomationModeIndicators } from "./automation-mode-indicators.client";
import { MissingKeysFunnel } from "./missing-keys-funnel.client";
import { useWaveLock } from "./wave-lock.client";
import { useUiLang } from "../use-ui-lang";
import { categoryHubStrings } from "../category-hub-i18n";
import { waveStrings } from "../wave-i18n";

// THE WAY BACK TO A POSTPONED WAVE (step 247, owner's fix): "Postpone launch" used to be a one-way door —
// once the banner hid, NOTHING on the page could bring the launch invitation back. This small button sits
// LEFT of the type badge and appears ONLY while changes are staged but the banner is postponed; clicking it
// clears the snooze (DELETE development-wave/postpone) and the banner returns with everything still staged.
function WaveReopenButton({ automation }: { automation: string }) {
  const { wave, refresh } = useWaveLock();
  const L = waveStrings(useUiLang());
  if (wave.state !== "staging" || !wave.snoozed) return null;
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-6 gap-1 border-primary/50 px-2 text-xs text-primary"
      onClick={async () => {
        await fetch(`/api/projects/development-wave/postpone`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ automation }),
        }).catch(() => {});
        refresh();
      }}
    >
      <Rocket className="size-3" /> {L.bannerLaunch}
    </Button>
  );
}

// FROZEN STANDARD (step 220) — the bar at the top of a fresh automation page: a breadcrumb back to the
// categories index on the left, and on the right the generic automation menu (AI provider / model +
// Settings + Tests). Header and footer themselves come from the Projects-zone layout (step 213).
export function AutomationStatusBar({
  category,
  categoryLabel,
  modelEnvKey,
  defaultModel,
  channels,
  probes,
  automation,
  type,
  entitiesSeed,
}: {
  category: string;
  categoryLabel: string;
  modelEnvKey: string;
  defaultModel: string;
  channels: InputChannel[];
  probes: Probe[];
  /** "category/slug" — the state pill reads this automation's live node index (step 224). */
  automation?: string;
  /** The immutable automation type — its badge sits LEFT of the state pill (step 224 §1.5). */
  type?: AutomationType;
  /** The project's _data/config.ts entities — seeds the menu's live visibility switches (step 237). */
  entitiesSeed?: Partial<EntitiesConfig>;
}) {
  const lang = useUiLang();
  const L = categoryHubStrings(lang);
  return (
    // Below XL the bar does not fit one line (owner 2026-07-19, 263.1): the badges+buttons move to their
    // OWN row ABOVE the breadcrumb, horizontally scrollable with the scrollbar hidden. XL+ keeps the
    // classic single row (breadcrumb left, badges right) via the order swap.
    <div className="flex flex-col gap-1 py-1 xl:flex-row xl:items-center xl:justify-between xl:gap-3">
      <span className="order-2 flex items-center gap-1.5 text-sm text-muted-foreground xl:order-1">
        <Link href="/projects" className="hover:underline">{L.breadcrumb}</Link>
        <span aria-hidden>/</span>
        <Link href={`/projects/${category}`} className="hover:underline">{categoryLabel}</Link>
      </span>
      <span className="order-1 flex items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:order-2 xl:overflow-visible">
        {/* Type badge + state pill (step 224 §1.5 / L6) — left of the burger. "In development" (indigo)
            while any node is still a draft: the automation is auto-stopped until every node is built. */}
        {automation && <WaveReopenButton automation={automation} />}
        {/* Step 248 — declared required keys with no value yet: an amber badge + a once-per-load funnel
            pointing at Settings (never over the problems modal). */}
        {automation && <MissingKeysFunnel automation={automation} channels={channels} />}
        {automation && <AutomationStatePill automation={automation} type={type ?? "stream"} />}
        {automation && <AutomationModeIndicators automation={automation} type={type} />}
        <AutomationMenu
          modelEnvKey={modelEnvKey}
          defaultModel={defaultModel}
          channels={channels}
          probes={probes}
          automation={automation}
          entitiesSeed={entitiesSeed}
          type={type}
        />
        {/* Step 249 — the owner's free comment ("I know what I dislike, not where to fix it"): saved as the
            `general` entity's brief, then handed over through the same two-button dialog. */}
        {automation && <SparklesComment automation={automation} />}
      </span>
    </div>
  );
}
