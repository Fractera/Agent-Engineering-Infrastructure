"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_ENTITY_ORDER, resolveEntityOrder, type OrderableKey } from "./entities";

// THE ENTITY-ORDER LIVE STATE (step 241, owner) — twin of use-entities-live.ts, for the DRAGGED section order
// instead of the on/off switches. The menu (which owns the drag handles) and AutomationAccordions (which
// renders in this order) both call this hook: on mount it reads the resolved order from
// /api/projects/entity-order; `setOrder` persists it AND broadcasts a window event so the accordions reorder
// the instant the owner drops a row — no rebuild, no shared React context across the server-rendered tree.
const EVENT = "fractera:entity-order-changed";

type Detail = { automation: string; order: OrderableKey[] };

export function useEntityOrderLive(automation: string | undefined) {
  const [order, setOrderState] = useState<OrderableKey[]>(DEFAULT_ENTITY_ORDER);

  useEffect(() => {
    if (!automation) { setOrderState(DEFAULT_ENTITY_ORDER); return; }
    let alive = true;
    fetch(`/api/projects/entity-order?automation=${encodeURIComponent(automation)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { order?: string[] } | null) => {
        if (alive && Array.isArray(d?.order)) setOrderState(resolveEntityOrder(d.order));
      })
      .catch(() => { /* keep the default */ });
    return () => { alive = false; };
  }, [automation]);

  useEffect(() => {
    if (!automation) return;
    const onChange = (e: Event) => {
      const d = (e as CustomEvent).detail as Detail;
      if (d.automation !== automation) return;
      setOrderState(resolveEntityOrder(d.order));
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [automation]);

  const setOrder = useCallback(
    async (next: OrderableKey[]) => {
      if (!automation) return;
      const resolved = resolveEntityOrder(next);
      setOrderState(resolved); // optimistic
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { automation, order: resolved } as Detail }));
      try {
        await fetch("/api/projects/entity-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ automation, order: resolved }),
        });
      } catch { /* optimistic state stands; next mount reconciles from the DB */ }
    },
    [automation],
  );

  return { order, setOrder };
}
