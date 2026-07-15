"use client";

import { useEffect, useRef } from "react";

// CRON-CHANGED LIVE SIGNAL (Cron+Calendar step) — the SAME window-CustomEvent idiom as
// use-run-refresh.ts / use-entities-live.ts / use-entity-order-live.ts, applied to a different fact: "this
// automation's cron settings just changed." Without this, the top-bar Cron indicator (a component mounted
// as a SIBLING of the Cron accordion, not a parent/child) only reflected the schedule/enabled state it
// fetched on its own mount — a toggle in the accordion never reached it until a full page reload.
// CronAccordion publishes right after a successful save; AutomationModeIndicators subscribes and updates
// its pill instantly, no refetch needed (the new state rides along in the event itself).
const EVENT = "fractera:automation-cron-changed";

type Detail = { automation: string; enabled: boolean; schedule: string };

/** Call right after a cron settings save reports success. */
export function notifyCronChanged(automation: string, enabled: boolean, schedule: string): void {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { automation, enabled, schedule } as Detail }));
}

/** Subscribe: `onChange` fires whenever THIS automation's cron settings just changed. `onChange` is read
 *  through a ref (same hardening as useRunRefresh) — the listener is registered ONCE per `automation` and
 *  always calls the LATEST callback, never a closure captured at an earlier render. */
export function useCronLive(automation: string | undefined, onChange: (enabled: boolean, schedule: string) => void): void {
  const cbRef = useRef(onChange);
  useEffect(() => { cbRef.current = onChange; });

  useEffect(() => {
    if (!automation) return;
    const onEvent = (e: Event) => {
      const d = (e as CustomEvent).detail as Detail;
      if (d.automation === automation) cbRef.current(d.enabled, d.schedule);
    };
    window.addEventListener(EVENT, onEvent);
    return () => window.removeEventListener(EVENT, onEvent);
  }, [automation]);
}
