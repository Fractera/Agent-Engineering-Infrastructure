"use client";

import { useEffect, useRef } from "react";

// RUN-COMPLETED LIVE SIGNAL (step 243.2) — the SAME window-CustomEvent idiom as use-entities-live.ts /
// use-entity-order-live.ts, applied to a different fact: "this automation just finished a run." A
// successful ask (stream) or fork run (instanced) may have written rows any number of sibling sections on
// the SAME page read (today: the dashboard table) — without this, the owner had to reload the page to see
// them. `ActivationLayer` publishes once, right after a successful run; any mounted component on the page
// that cares (today: ConfigRecordsTable) subscribes via `useRunRefresh` and re-fetches its own data. No
// polling, no shared React context across the page tree — same reasoning as the entities-live hook.
const EVENT = "fractera:automation-run-completed";

type Detail = { automation: string };

/** Call right after a run/ask reports success. */
export function notifyRunCompleted(automation: string): void {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { automation } as Detail }));
}

/** Subscribe: `onRefresh` fires whenever THIS automation (not some other one on a hub page) just ran.
 *  `onRefresh` is read through a ref (step 243.4 hardening) — the listener is registered ONCE per
 *  `automation` and always calls the LATEST callback, never a closure captured at an earlier render. */
export function useRunRefresh(automation: string | undefined, onRefresh: () => void): void {
  const cbRef = useRef(onRefresh);
  useEffect(() => { cbRef.current = onRefresh; });

  useEffect(() => {
    if (!automation) return;
    const onEvent = (e: Event) => {
      const d = (e as CustomEvent).detail as Detail;
      if (d.automation === automation) cbRef.current();
    };
    window.addEventListener(EVENT, onEvent);
    return () => window.removeEventListener(EVENT, onEvent);
  }, [automation]);
}
