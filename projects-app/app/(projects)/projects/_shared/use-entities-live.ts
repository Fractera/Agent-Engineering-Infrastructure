"use client";

import { useEffect, useState } from "react";
import type { EntityKey, EntitiesConfig } from "./entities";

// THE ENTITIES LIVE STATE (step 237) — every component that cares about an entity's ON/OFF state (the
// menu switches, DiagramSection, AutomationAccordions) calls this SAME hook instead of each rolling its
// own fetch. On mount it merges the project's SEED (its own _data/config.ts, passed in as `seed`) with the
// live DB override (GET /api/projects/entities) — live wins. `setEntity` writes the override (POST) AND
// broadcasts a window CustomEvent so every other mounted instance on the page (e.g. the menu's switch and
// the Diagram section below it) updates INSTANTLY, no rebuild, no shared React context needed across the
// server-rendered page tree.
const EVENT = "fractera:entities-changed";

type Detail = { automation: string; key: EntityKey; value: boolean };

export function useEntitiesLive(automation: string | undefined, seed: Partial<EntitiesConfig>) {
  const [entities, setEntities] = useState<Partial<EntitiesConfig>>(seed);

  useEffect(() => {
    setEntities(seed);
    if (!automation) return;
    let alive = true;
    fetch(`/api/projects/entities?automation=${encodeURIComponent(automation)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { entities?: Partial<EntitiesConfig> } | null) => {
        if (alive && d?.entities) setEntities((prev) => ({ ...prev, ...d.entities }));
      })
      .catch(() => { /* keep the seed */ });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automation]);

  useEffect(() => {
    if (!automation) return;
    const onChange = (e: Event) => {
      const d = (e as CustomEvent).detail as Detail;
      if (d.automation !== automation) return;
      setEntities((prev) => ({ ...prev, [d.key]: d.value }));
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [automation]);

  async function setEntity(key: EntityKey, value: boolean) {
    if (!automation) return;
    setEntities((prev) => ({ ...prev, [key]: value })); // optimistic
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { automation, key, value } as Detail }));
    try {
      await fetch("/api/projects/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation, key, value }),
      });
    } catch { /* optimistic state stands; next mount reconciles from the DB */ }
  }

  return { entities, setEntity };
}
