"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUiLang } from "../../../use-ui-lang";
import { cronStrings } from "../../../cron-i18n";
import { notifyCronChanged } from "../../../use-cron-live";
import { scheduleLabel, type CronState } from "../view/status";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3 — breaking this breaks the whole chain, FORBIDDEN):
// ADMIN file — may import view/, must NEVER be imported by view/ and never reach into another entity.
// Enforced by `npm run check:entity-imports`.
//
// THE CRON — ADMIN CHROME (step 254.5): the schedule CONTROLS — the enabled toggle + the eight fixed
// intervals, each auto-saving into the automation's co-located cron.json through the generic
// /api/projects/settings/cron route. Pure management: a visitor never changes when an automation ticks.
export function CronControls({
  automation, state, patch,
}: { automation: string; state: CronState; patch: (next: Partial<CronState>) => void }) {
  const lang = useUiLang();
  const L = cronStrings(lang);
  const [busy, setBusy] = useState(false);

  async function save(next: Partial<Pick<CronState, "schedule" | "enabled">>) {
    const prev = { schedule: state.schedule, enabled: state.enabled };
    const merged = { ...prev, ...next };
    patch(next);
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/settings/cron`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation, ...next }),
      });
      if (!r.ok) {
        patch(prev);
        toast.error(L.saveFailed);
        return;
      }
      toast.success(L.saved);
      // Live signal — the top-bar Cron pill reflects this instantly instead of waiting for a reload.
      notifyCronChanged(automation, merged.enabled, merged.schedule);
    } catch {
      patch(prev);
      toast.error(L.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  const OPTIONS: Array<{ schedule: string; label: string }> = [
    "* * * * *", "*/5 * * * *", "*/15 * * * *", "*/30 * * * *",
    "0 * * * *", "0 */6 * * *", "0 */12 * * *", "0 0 * * *",
  ].map((schedule) => ({ schedule, label: scheduleLabel(schedule, L) }));

  if (!state.exists) return null;

  return (
    <div className="space-y-3" data-cron-admin="controls">
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
    </div>
  );
}
