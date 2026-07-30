"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { STATUS_META, type UseCaseStatus } from "../status";
import { noDescription } from "../i18n";

// СПИСОК КЕЙСОВ (read-only) — рантайм/публичная половина вкладки: то, что видит конечный пользователь
// (как v1 «view mode»). Только чтение: номер, заголовок, цветной статус, описание. Никаких карандашей,
// удаления, Quiz — это дев/админ, он живёт в `_shared-v2` и подтягивается дев-слотом.
type Case = { cuid: string; title: string; text: string; status: string };

export default function CaseList({ cases, lang }: { cases: Case[]; lang: string }) {
  if (!cases.length) return null; // пусто — секции нет вовсе

  return (
    <Accordion type="single" collapsible defaultValue={cases[0]?.cuid} className="rounded-lg border px-4">
      {cases.map((c, i) => {
        const st = STATUS_META[c.status as UseCaseStatus] ?? STATUS_META["new"];
        return (
          <AccordionItem key={c.cuid} value={c.cuid}>
            <AccordionTrigger className="text-left">
              <span className="flex items-center gap-3">
                <span className="text-2xl font-bold tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st.className}`}>{st.label}</span>
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm leading-relaxed text-muted-foreground">{c.text || noDescription(lang)}</p>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
