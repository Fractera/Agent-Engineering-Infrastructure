"use client";

import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { dashboardAdminStrings, pick } from "./i18n";
import { columnsOf, tableOf, type Column, type DashboardTab, type TableEntity } from "../types/dashboard";

// НАСТРОЙКА ТАБЛИЦ — АДМИН-половина дашборда (дев-слой, шаг 298). Для каждой таблицы: её хранилище и
// объявленные колонки, ровно так, как это записано в ЯДРЕ.
//
// САМОДОСТАТОЧНА: объявление читает сама через дверь автоматизации `api/core?select=tab:dashboard`, поэтому
// папке автоматизации не нужно прокидывать сюда сущности — там остаётся только тонкий монтаж.
//
// ТОЛЬКО shadcn: Accordion (+ таблица в стиле shadcn — примитива Table в наборе нет).

const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";

function ColumnsTable({ columns, lang }: { columns: Column[]; lang: string }) {
  const L = dashboardAdminStrings(lang);
  if (columns.length === 0) return <p className="text-sm text-muted-foreground">{L.noColumns}</p>;
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
          <th className="py-1 pr-4 font-medium">{L.columnKey}</th>
          <th className="py-1 font-medium" />
        </tr>
      </thead>
      <tbody>
        {columns.map((c) => (
          <tr key={c.key} className="border-b last:border-b-0">
            <td className="py-1 pr-4 font-mono text-xs">{c.key}</td>
            <td className="py-1 text-xs text-muted-foreground">{pick(c.label, lang)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DashboardSettings({ lang }: { lang: string }) {
  const L = dashboardAdminStrings(lang);
  const [entities, setEntities] = useState<TableEntity[]>([]);

  useEffect(() => {
    let alive = true;
    fetch(`${apiBase()}/core?select=tab:dashboard`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: DashboardTab | null) => { if (alive && d?.entities) setEntities(d.entities); })
      .catch(() => { /* нет двери — настройка просто не наполнится */ });
    return () => { alive = false; };
  }, []);

  if (!entities.length) return null;

  return (
    <section data-dashboard="admin" className="border-t pt-3">
      <Accordion type="single" collapsible>
        <AccordionItem value="table-settings">
          <AccordionTrigger className="py-2">{L.settings}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-1">
              <p className="text-xs text-muted-foreground">{L.settingsHint}</p>
              {entities.map((entity) => (
                <div key={entity.cuid} className="space-y-2">
                  <p className="text-sm font-medium">
                    {pick(entity.data.title, lang) || entity.name}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {L.table}: <span className="font-mono">{tableOf(entity)}</span>
                    </span>
                  </p>
                  <ColumnsTable columns={columnsOf(entity)} lang={lang} />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
