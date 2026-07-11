"use client";

import Link from "next/link";
import type { InputChannel } from "../channels";
import type { Probe } from "../tests";
import { AutomationMenu } from "./automation-menu.client";

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
}: {
  category: string;
  categoryLabel: string;
  modelEnvKey: string;
  defaultModel: string;
  channels: InputChannel[];
  probes: Probe[];
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/projects" className="hover:underline">← Projects</Link>
        <span aria-hidden>/</span>
        <Link href={`/projects/${category}`} className="hover:underline">{categoryLabel}</Link>
      </span>
      <span className="flex items-center gap-2">
        <AutomationMenu
          modelEnvKey={modelEnvKey}
          defaultModel={defaultModel}
          channels={channels}
          probes={probes}
        />
      </span>
    </div>
  );
}
