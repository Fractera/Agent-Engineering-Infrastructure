"use client";

import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { UseCase } from "../../../use-cases";
import { useUiLang } from "../../../use-ui-lang";
import { useCasesStrings } from "../../../use-cases-i18n";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3 — breaking this breaks the whole chain, FORBIDDEN):
// VIEW file — never import admin/ or another entity. Enforced by `npm run check:entity-imports`.
//
// THE USE CASES — VIEW CORE (step 254.8, owner's ruling): the read-only FAQ-style list of what this
// automation can do — number + title as the question, the summary as the answer, the lifecycle status as
// a small badge. NO pencils, NO delete, NO quiz, NO review gate — those are the owner's admin surface.
// Live cases are fetched (the store is the source); the seed prop covers a store not yet reachable.
export function UseCasesListView({ automation, seed }: { automation?: string; seed: UseCase[] }) {
  const lang = useUiLang();
  const L = useCasesStrings(lang);
  const [cases, setCases] = useState<UseCase[]>(seed);

  useEffect(() => {
    if (!automation) return;
    let alive = true;
    fetch(`/api/projects/use-cases?automation=${encodeURIComponent(automation)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { cases?: { cuid: string; title: string; summary: string; status: string }[] } | null) => {
        if (!alive || !d?.cases) return;
        setCases(d.cases.map((c) => ({ id: c.cuid, title: c.title, summary: c.summary, status: c.status as UseCase["status"] })));
      })
      .catch(() => { /* keep the seed */ });
    return () => { alive = false; };
  }, [automation]);

  if (!cases.length) {
    return <p className="text-sm text-muted-foreground" data-usecases-view="empty">{L.sectionTooltip}</p>;
  }

  return (
    <Accordion type="single" collapsible className="rounded-lg border px-4" data-usecases-view="list">
      {cases.map((c, i) => (
        <AccordionItem key={c.id} value={c.id}>
          <AccordionTrigger className="text-left">
            <span className="flex min-w-0 items-center gap-2">
              <span className="tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <span className="truncate font-medium">{c.title}</span>
              <span className="rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{c.status}</span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground">{c.summary || "—"}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
