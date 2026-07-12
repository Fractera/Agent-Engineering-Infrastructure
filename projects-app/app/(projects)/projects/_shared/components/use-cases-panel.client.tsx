"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { UseCase } from "../use-cases";
import { STATUS_META } from "../use-cases";

// FROZEN STANDARD (step 222) — the Use cases panel. A nested accordion, one item per case. The trigger
// carries a big number (01, 02, …) so the owner can refer to a case by number, the case title, and a
// colored STATUS badge. The content is the case description. Data from the project's _data/use-cases.ts;
// a fresh skeleton is seeded with one case ("Architect planned the automation" / new).
export function UseCasesPanel({ cases }: { cases: UseCase[] }) {
  if (!cases.length) {
    return <p className="text-sm text-muted-foreground">No user cases yet.</p>;
  }
  return (
    <Accordion type="single" collapsible defaultValue={cases[0]?.id} className="rounded-lg border px-4">
      {cases.map((c, i) => {
        const st = STATUS_META[c.status];
        return (
          <AccordionItem key={c.id} value={c.id}>
            <AccordionTrigger className="text-left">
              <span className="flex items-center gap-3">
                <span className="text-2xl font-bold tabular-nums text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st.className}`}>
                    {st.label}
                  </span>
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {c.summary ?? "No description yet."}
              </p>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
