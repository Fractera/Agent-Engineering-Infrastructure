"use client";

import { useEffect, useState } from "react";
import { automationTypeSpec, type AutomationType } from "../automation-type";
import { useUiLang } from "../use-ui-lang";
import { automationStatePillStrings } from "../automation-state-pill-i18n";
import { fill } from "../quiz-i18n";

// FROZEN STANDARD (step 224 L6) — the top-bar pair every automation page carries: the immutable TYPE badge
// and the automation STATE pill, in that order, left of the burger (owner's design).
//
// THE THIRD STATE — "In development" (indigo). While ANY node of the automation is still a DRAFT (not built
// yet), the automation is AUTOMATICALLY STOPPED: you cannot run an automation with unfinished nodes. The
// pill shows "In development" and activation is blocked until every node is materialized. This is a safety
// interlock, not a cosmetic state: it reads the live node index, so it is DB-backed and always honest.
// Running forks/Instances of an earlier canvas snapshot keep working — the interlock is about the Master
// (223.C.4 isolation).
type IndexNode = { draft: number; status: string };

export function AutomationStatePill({
  automation,
  type,
  active,
}: {
  automation: string;
  type: AutomationType;
  /** The automation's own on/off switch (when it has one). Ignored while any node is a draft. */
  active?: boolean;
}) {
  const [drafts, setDrafts] = useState<number | null>(null);
  const lang = useUiLang();
  const spec = automationTypeSpec(type, lang);
  const L = automationStatePillStrings(lang);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const r = await fetch(`/api/projects/nodes?automation=${encodeURIComponent(automation)}`, { cache: "no-store" });
        if (!r.ok || !alive) return;
        const d = (await r.json()) as { nodes: IndexNode[] };
        if (alive) setDrafts((d.nodes ?? []).filter((n) => n.draft === 1).length);
      } catch { /* keep unknown */ }
    })();
    return () => { alive = false; };
  }, [automation]);

  const inDevelopment = drafts === null ? false : drafts > 0;
  const state = inDevelopment
    ? { dot: "bg-indigo-500", text: "text-indigo-600 dark:text-indigo-400", label: fill(drafts === 1 ? L.inDevOne : L.inDevN, { n: drafts ?? 0 }) }
    : active === false
      ? { dot: "bg-red-500", text: "text-red-600 dark:text-red-500", label: L.stopped }
      : { dot: "bg-green-500", text: "text-green-600 dark:text-green-500", label: L.active };

  return (
    <span className="flex items-center gap-2">
      {/* Immutable type badge — to change the type you delete the automation and create a new one. */}
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${spec.badge}`}
        title={spec.description}
      >
        {spec.title}
      </span>
      <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
        <span className={`size-2.5 rounded-full ${state.dot}`} aria-hidden />
        <span className={state.text}>{state.label}</span>
      </span>
    </span>
  );
}
