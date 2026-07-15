"use client";

import { useEffect, useState } from "react";
import { periodSecFromSchedule } from "../cron-period";
import { useCronLive } from "../use-cron-live";

// FROZEN STANDARD — the top-of-page cron slider, generalized from personal/telegram-notes' own
// cron-progress-bar (step 218) into the frozen starter (owner request, 2026-07-15). A 2px, full-bleed,
// orange bar that shrinks left→right over ONE cron period, then resets — a live pulse whose speed IS this
// automation's cron interval.
//
// SHOWN ONLY WHILE CRON IS ACTIVE (the owner's rule for the frozen template — unlike the telegram-notes
// precedent, which always ticked). It reads this automation's `enabled` flag from the generic cron settings
// route (`/api/projects/settings/cron`, the SAME route the Cron accordion reads/writes) and renders NOTHING
// while cron is off. It updates live the moment the owner flips the Cron accordion's switch or changes the
// interval — the shared cron-changed event (useCronLive), no page reload.
//
// WHAT IT MEANS (read before touching): this visualizes the OUTGOING (scheduled) side only — sending a due
// reminder, polling a calendar, any periodic check. It says NOTHING about INCOMING events, which are always
// delivered instantly through a hook/push channel with zero relation to this timer. Tying an automation's
// reception to this cron period would be a regression, not a feature (same note as the original).
export function CronProgressBar({ automation }: { automation: string }) {
  const [enabled, setEnabled] = useState(false);
  const [periodSec, setPeriodSec] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(60);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/settings/cron?automation=${encodeURIComponent(automation)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { enabled?: boolean; schedule?: string } | null) => {
        if (cancelled) return;
        setEnabled(Boolean(d?.enabled));
        setPeriodSec(periodSecFromSchedule(d?.schedule));
      })
      // No cron settings route (e.g. a bare skeleton without cron.json) — stay hidden rather than crash.
      .catch(() => { if (!cancelled) { setEnabled(false); setPeriodSec(60); } });
    return () => { cancelled = true; };
  }, [automation]);

  // Live: the owner just toggled cron / changed the interval in the accordion — reflect it instantly (the
  // bar appears, disappears, or changes speed) without a page reload.
  useCronLive(automation, (nextEnabled, schedule) => {
    setEnabled(nextEnabled);
    setPeriodSec(periodSecFromSchedule(schedule));
  });

  useEffect(() => {
    if (!enabled || !periodSec) return;
    const period = periodSec; // narrowed once — no non-null assertions inside the closure
    function tick() {
      const now = Math.floor(Date.now() / 1000);
      const rem = period - (now % period);
      setRemaining(rem === 0 ? period : rem);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [enabled, periodSec]);

  // Cron off (or unknown) → no bar at all: the moving bar's ONLY meaning is "cron is active".
  if (!enabled || !periodSec) return null;

  const pct = Math.max(0, Math.min(100, (remaining / periodSec) * 100));
  return (
    <div className="h-0.5 w-full overflow-hidden bg-muted" aria-hidden>
      <div
        className="h-full bg-orange-500 transition-[width] duration-1000 ease-linear"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
