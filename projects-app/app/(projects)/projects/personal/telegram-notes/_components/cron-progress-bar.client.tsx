"use client";

import { useEffect, useState } from "react";
import { periodSecFromSchedule } from "../../_shared/cron-period";

// FROZEN STANDARD — the top-of-page cron slider (step 218). A 2px, full-bleed, orange bar
// that shrinks left→right over one cron period, then resets — every automation page carries
// this, unconditionally of automation type.
//
// WHAT IT MEANS (read before touching): this bar visualizes the period of this automation's
// SCHEDULED (cron) work — the OUTGOING side: sending a due reminder/email, polling an external
// calendar, running any periodic check. It says NOTHING about INCOMING events. A new record /
// message / webhook must NEVER wait for this bar — incoming events are always delivered
// instantly through a hook/push channel (telegram-notes: the substrate listener → the run
// route; the page itself live-refreshes via AutoRefresh) with zero relation to this timer. If a
// future automation's reception is ever tied to this cron period, that is a regression, not a
// feature — reception and this slider are two different concerns by design.
//
// Today the bar always ticks regardless of the automation's enabled/disabled state (the enabled
// dependency is a documented FUTURE step, not implemented yet). A fresh project from the frozen
// starter defaults to a 1-minute period (see cron.json's default schedule, "* * * * *").
export function CronProgressBar({ category, slug }: { category: string; slug: string }) {
  const [periodSec, setPeriodSec] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(60);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${category}/${slug}/settings`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { schedule?: string } | null) => {
        if (!cancelled) setPeriodSec(periodSecFromSchedule(d?.schedule));
      })
      // No settings route yet (e.g. a bare frozen skeleton) — degrade to the documented
      // 1-minute default rather than crash; the bar still renders, just static-feeling.
      .catch(() => { if (!cancelled) setPeriodSec(60); });
    return () => { cancelled = true; };
  }, [category, slug]);

  useEffect(() => {
    if (!periodSec) return;
    function tick() {
      const now = Math.floor(Date.now() / 1000);
      const rem = periodSec! - (now % periodSec!);
      setRemaining(rem === 0 ? periodSec! : rem);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [periodSec]);

  const pct = periodSec ? Math.max(0, Math.min(100, (remaining / periodSec) * 100)) : 100;
  return (
    <div className="h-0.5 w-full overflow-hidden bg-muted" aria-hidden>
      <div
        className="h-full bg-orange-500 transition-[width] duration-1000 ease-linear"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
