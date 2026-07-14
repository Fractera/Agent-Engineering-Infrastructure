"use client";

import Link from "next/link";
import type { InputChannel } from "../channels";
import type { Probe } from "../tests";
import type { AutomationType } from "../automation-type";
import type { EntitiesConfig } from "../entities";
import { AutomationMenu } from "./automation-menu.client";
import { AutomationStatePill } from "./automation-state-pill.client";
import { useUiLang } from "../use-ui-lang";
import { categoryHubStrings } from "../category-hub-i18n";

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
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/projects" className="hover:underline">{L.breadcrumb}</Link>
        <span aria-hidden>/</span>
        <Link href={`/projects/${category}`} className="hover:underline">{categoryLabel}</Link>
      </span>
      <span className="flex items-center gap-2">
        {/* Type badge + state pill (step 224 §1.5 / L6) — left of the burger. "In development" (indigo)
            while any node is still a draft: the automation is auto-stopped until every node is built. */}
        {automation && <AutomationStatePill automation={automation} type={type ?? "stream"} />}
        <AutomationMenu
          modelEnvKey={modelEnvKey}
          defaultModel={defaultModel}
          channels={channels}
          probes={probes}
          automation={automation}
          entitiesSeed={entitiesSeed}
        />
      </span>
    </div>
  );
}
