"use client";

import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { controlPanelStrings as controlPanelAdminStrings, pick } from "../../i18n";
import { paramsOf, type ControlPanelTab, type Param, type PanelEntity } from "../../types-panel";

// НАСТРОЙКА ЗАПРОСА — АДМИН-половина пульта (дев-слой, шаг 298). Показывает поля КАЖДОГО пульта вкладки
// так, как они объявлены в ЯДРЕ: источник истины один, здесь его видно глазами.
//
// САМОДОСТАТОЧНА: объявление читает сама через дверь автоматизации `api/core?select=tab:control-panel`
// (относительным путём от адреса страницы, как «Строить вместе с ИИ»), поэтому папке автоматизации не нужно
// прокидывать сюда сущности — там остаётся только тонкий монтаж.
//
// ТОЛЬКО shadcn (правило владельца): Accordion + Badge.

const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";

function ParamsTable({ params, lang }: { params: Param[]; lang: string }) {
  const L = controlPanelAdminStrings(lang);
  if (params.length === 0) return <p className="text-sm text-muted-foreground">{L.noParams}</p>;
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
          <th className="py-1 pr-4 font-medium">{L.paramKey}</th>
          <th className="py-1 pr-4 font-medium">{L.paramType}</th>
          <th className="py-1 font-medium" />
        </tr>
      </thead>
      <tbody>
        {params.map((p) => (
          <tr key={p.key} className="border-b last:border-b-0">
            <td className="py-1 pr-4 font-mono text-xs">{p.key}</td>
            <td className="py-1 pr-4">
              <Badge variant="outline" className="font-mono">{p.type ?? "text"}</Badge>
            </td>
            <td className="py-1">
              <Badge variant={p.required ? "secondary" : "outline"}>{p.required ? L.required : L.optional}</Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ControlPanelSettings({ lang }: { lang: string }) {
  const L = controlPanelAdminStrings(lang);
  const [entities, setEntities] = useState<PanelEntity[]>([]);

  useEffect(() => {
    let alive = true;
    fetch(`${apiBase()}/core?select=tab:control-panel`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ControlPanelTab | null) => { if (alive && d?.entities) setEntities(d.entities); })
      .catch(() => { /* нет двери — настройка просто не наполнится */ });
    return () => { alive = false; };
  }, []);

  if (!entities.length) return null;

  return (
    <section data-control-panel="admin" className="border-t pt-3">
      <Accordion type="single" collapsible>
        <AccordionItem value="request-settings">
          <AccordionTrigger className="py-2">{L.settings}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-1">
              <p className="text-xs text-muted-foreground">{L.settingsHint}</p>
              {entities.map((entity) => (
                <div key={entity.cuid} className="space-y-2">
                  <p className="text-sm font-medium">{pick(entity.data.title, lang) || entity.name}</p>
                  <ParamsTable params={paramsOf(entity)} lang={lang} />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
