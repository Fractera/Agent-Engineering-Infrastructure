"use client";

import { useEffect, useState } from "react";
import type { AutomationType } from "../automation-type";
import { useUiLang } from "../use-ui-lang";
import { automationModeIndicatorsStrings } from "../automation-mode-indicators-i18n";
import { useCronLive } from "../use-cron-live";

// THE TWO MODE PILLS (Cron+Calendar step, owner's design) — next to AutomationStatePill, same visual shape
// (dot + label in a rounded-full border pill). Two independent ways this automation's work can start:
//   - Hook: the owner's OWN request through the ask console (`/api/projects/run`, already existed) —
//     reuses the SAME `designed` fetch ActivationLayer already does, no new endpoint. Only meaningful for
//     stream/instanced (a chained group has no ask console at all — ActivationLayer's own gate).
//   - Cron: this automation's OWN periodic tick (a co-located cron.json, independent of any request) —
//     reads the new generic `/api/projects/settings/cron` route. Hidden entirely when the automation has no
//     cron.json (existing automations, or a type the generator never gave one to) — never a broken pill.
export function AutomationModeIndicators({ automation, type }: { automation: string; type?: AutomationType }) {
  const lang = useUiLang();
  const L = automationModeIndicatorsStrings(lang);
  const [designed, setDesigned] = useState<boolean | null>(null);
  const [cron, setCron] = useState<{ exists: boolean; enabled: boolean } | null>(null);

  const showHook = type !== "chained";

  useEffect(() => {
    let alive = true;
    if (showHook) {
      fetch(`/api/projects/activation?automation=${encodeURIComponent(automation)}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { designed?: boolean } | null) => { if (alive) setDesigned(Boolean(d?.designed)); })
        .catch(() => { if (alive) setDesigned(false); });
    }
    fetch(`/api/projects/settings/cron?automation=${encodeURIComponent(automation)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { exists?: boolean; enabled?: boolean } | null) => {
        if (alive) setCron({ exists: d?.exists !== false, enabled: Boolean(d?.enabled) });
      })
      .catch(() => { if (alive) setCron({ exists: false, enabled: false }); });
    return () => { alive = false; };
  }, [automation, showHook]);

  // Live update (Cron+Calendar step): a toggle in the Cron accordion (a sibling, not a parent/child of this
  // component) publishes its new state right after saving — reflect it instantly, no page reload, no
  // refetch (the new state rides along in the event itself).
  useCronLive(automation, (enabled) => setCron((c) => ({ exists: c?.exists ?? true, enabled })));

  const pill = (dotClass: string, textClass: string, label: string) => (
    <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
      <span className={`size-2.5 rounded-full ${dotClass}`} aria-hidden />
      <span className={textClass}>{label}</span>
    </span>
  );

  return (
    <>
      {showHook && designed !== null &&
        pill(
          designed ? "bg-green-500" : "bg-zinc-400",
          designed ? "text-green-600 dark:text-green-500" : "text-muted-foreground",
          `${L.hookLabel}: ${designed ? L.hookOn : L.hookOff}`,
        )}
      {cron?.exists &&
        pill(
          cron.enabled ? "bg-green-500" : "bg-zinc-400",
          cron.enabled ? "text-green-600 dark:text-green-500" : "text-muted-foreground",
          `${L.cronLabel}: ${cron.enabled ? L.cronOn : L.cronOff}`,
        )}
    </>
  );
}
