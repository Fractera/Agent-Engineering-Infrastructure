"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useUiLang } from "../../../use-ui-lang";
import { cronStrings } from "../../../cron-i18n";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3 — breaking this breaks the whole chain, FORBIDDEN):
// VIEW file — never import admin/ or another entity. Enforced by `npm run check:entity-imports`.
//
// THE CRON — VIEW CORE (step 254.5): the read-only schedule STATUS ("ticks every 5 minutes" / "off").
// Changing the schedule is management (../admin/chrome.tsx) — a visitor only learns whether and how often
// this automation wakes up on its own.

/** The human label of one of the eight fixed schedules (shared with the admin picker via cron-i18n). */
export function scheduleLabel(schedule: string, L: ReturnType<typeof cronStrings>): string {
  const map: Record<string, string> = {
    "* * * * *": L.everyMinute,
    "*/5 * * * *": L.every5Min,
    "*/15 * * * *": L.every15Min,
    "*/30 * * * *": L.every30Min,
    "0 * * * *": L.hourly,
    "0 */6 * * *": L.every6h,
    "0 */12 * * *": L.every12h,
    "0 0 * * *": L.daily,
  };
  return map[schedule] ?? schedule;
}

export type CronState = { exists: boolean; schedule: string; enabled: boolean; loaded: boolean };

/** One shared loader for both planes: GET the automation's cron declaration. */
export function useCronState(automation: string): [CronState, (next: Partial<CronState>) => void] {
  const [state, setState] = useState<CronState>({ exists: true, schedule: "*/5 * * * *", enabled: false, loaded: false });
  useEffect(() => {
    let alive = true;
    fetch(`/api/projects/settings/cron?automation=${encodeURIComponent(automation)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { exists?: boolean; schedule?: string; enabled?: boolean } | null) => {
        if (!alive) return;
        setState({
          exists: d?.exists !== false,
          schedule: d?.schedule ?? "*/5 * * * *",
          enabled: Boolean(d?.enabled),
          loaded: true,
        });
      })
      .catch(() => { if (alive) setState((s) => ({ ...s, loaded: true })); });
    return () => { alive = false; };
  }, [automation]);
  const patch = (next: Partial<CronState>) => setState((s) => ({ ...s, ...next }));
  return [state, patch];
}

export function CronStatusView({ state }: { state: CronState }) {
  const lang = useUiLang();
  const L = cronStrings(lang);
  if (!state.exists) return <p className="text-xs text-muted-foreground" data-cron-view="none">{L.noCronYet}</p>;
  return (
    <p className="flex items-center gap-2 text-sm" data-cron-view="status">
      <Clock className="size-4 text-muted-foreground" />
      <span className={state.enabled ? "font-medium" : "text-muted-foreground"}>
        {state.enabled ? `${L.statusOn} · ${scheduleLabel(state.schedule, L)}` : L.statusOff}
      </span>
    </p>
  );
}
