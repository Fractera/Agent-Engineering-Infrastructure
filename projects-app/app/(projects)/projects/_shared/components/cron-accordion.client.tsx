"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUiLang } from "../use-ui-lang";
import { cronStrings } from "../cron-i18n";
import { notifyCronChanged } from "../use-cron-live";

// THE CRON ACCORDION — generalizes the ONE existing precedent (personal/telegram-notes'
// `interval-settings.client.tsx`, hardcoded to its own automation) into a component ANY automation with a
// co-located cron.json can mount, hitting the new generic `/api/projects/settings/cron` route instead of a
// per-automation one. Two independent controls, each auto-saves on change (no separate Save button, same
// UX as the telegram-notes precedent): the schedule (8 fixed cron expressions, minute-granular — the
// scheduler's own floor) and an enabled toggle (this automation's OWN addition — telegram-notes' job is
// always on, ours defaults OFF so a fresh automation never starts ticking without the owner's say-so).
type State = { schedule: string; enabled: boolean; loaded: boolean };

export function CronAccordion({ automation }: { automation: string }) {
  const lang = useUiLang();
  const L = cronStrings(lang);
  const [state, setState] = useState<State>({ schedule: "*/5 * * * *", enabled: false, loaded: false });
  const [exists, setExists] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/projects/settings/cron?automation=${encodeURIComponent(automation)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { exists?: boolean; schedule?: string; enabled?: boolean } | null) => {
        if (!alive) return;
        setExists(d?.exists !== false);
        setState({ schedule: d?.schedule ?? "*/5 * * * *", enabled: Boolean(d?.enabled), loaded: true });
      })
      .catch(() => {
        if (alive) setState((s) => ({ ...s, loaded: true }));
      });
    return () => { alive = false; };
  }, [automation]);

  async function save(next: Partial<Pick<State, "schedule" | "enabled">>) {
    const prev = state;
    const merged = { ...state, ...next };
    setState((s) => ({ ...s, ...next }));
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/settings/cron`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation, ...next }),
      });
      if (!r.ok) {
        setState(prev);
        toast.error(L.saveFailed);
        return;
      }
      toast.success(L.saved);
      // Live signal (Cron+Calendar step) — the top-bar Cron pill (a sibling component, not a parent/child)
      // reflects this instantly instead of waiting for a page reload.
      notifyCronChanged(automation, merged.enabled, merged.schedule);
    } catch {
      setState(prev);
      toast.error(L.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  const OPTIONS: Array<{ schedule: string; label: string }> = [
    { schedule: "* * * * *", label: L.everyMinute },
    { schedule: "*/5 * * * *", label: L.every5Min },
    { schedule: "*/15 * * * *", label: L.every15Min },
    { schedule: "*/30 * * * *", label: L.every30Min },
    { schedule: "0 * * * *", label: L.hourly },
    { schedule: "0 */6 * * *", label: L.every6h },
    { schedule: "0 */12 * * *", label: L.every12h },
    { schedule: "0 0 * * *", label: L.daily },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{L.description}</p>

      {!exists ? (
        <p className="text-xs text-muted-foreground">{L.noCronYet}</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{L.enabledLabel}</p>
              <p className="text-xs text-muted-foreground">{state.enabled ? L.statusOn : L.statusOff}</p>
            </div>
            <Switch
              checked={state.enabled}
              disabled={busy || !state.loaded}
              onCheckedChange={(checked) => void save({ enabled: checked })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{L.intervalLabel}</label>
            <Select
              value={state.loaded ? state.schedule : undefined}
              onValueChange={(next) => void save({ schedule: next })}
              disabled={busy || !state.loaded}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder={L.loading} />
              </SelectTrigger>
              <SelectContent>
                {OPTIONS.map((o) => (
                  <SelectItem key={o.schedule} value={o.schedule}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">{L.granularityNote}</p>
        </>
      )}
    </div>
  );
}
