"use client";

import { useState } from "react";
import type { Entity } from "../../../_data/automation.schema";
import { controlPanelStrings, pick } from "../i18n";
import { paramsOf, dataText } from "../params";
import ParamField from "./components/param-field.client";
import RunReport, { type Outcome } from "./components/run-report.client";
import { notifyRunCompleted } from "../../shared/run-events";

// ПЕРВЫЙ ПУЛЬТ ЗАПУСКА — публичная половина вкладки: поля запроса, кнопка и результат. Только
// использование. Виден на обеих поверхностях: посетителю — как вся вкладка, владельцу — как её верхняя
// половина (образец v1: активация есть использование, а не управление).
//
// ОДИН ФАЙЛ ЭТОЙ ПАПКИ = ОДИН ПУЛЬТ. Второй пульт вкладки ляжет рядом (`second-control-panel.tsx`) и
// возьмёт те же общие компоненты из `components/`. Сколько пультов — решает ядро (entities вкладки).
//
// Что спрашивать — сказано в ядре (`entity.data.params`), здесь только рисуется. Запуск идёт в
// собственную дверь `api/run` ОТНОСИТЕЛЬНО текущего пути (закон 0: папка переносима).
export default function FirstControlPanel({ entity, lang }: { entity: Entity; lang: string }) {
  const L = controlPanelStrings(lang);
  const params = paramsOf(entity);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const missing = params.filter((p) => p.required && !String(values[p.key] ?? "").trim()).map((p) => p.key);

  async function ask() {
    if (missing.length) return;
    setBusy(true);
    setOutcome(null);
    try {
      const apiBase = location.pathname.replace(/\/+$/, "") + "/api";
      const r = await fetch(`${apiBase}/run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: values }),
      });
      const result = (await r.json()) as Outcome;
      setOutcome(result);
      // Прогон мог записать строки, которые читают соседние секции страницы — объявляем факт, и они
      // обновляются сами. Перезагрузка страницы для этого не нужна и не должна быть нужна.
      if (!("refusal" in result) && result.ok) notifyRunCompleted();
    } catch (e) {
      setOutcome({ ok: false, nodes: [], error: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  const title = pick(dataText(entity, "title"), lang) || entity.name;
  const description = pick(dataText(entity, "description"), lang);

  return (
    <section data-control-panel="public" data-entity-cuid={entity.cuid} className="space-y-3 py-2">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>

      {params.length === 0 ? (
        <p className="text-sm text-muted-foreground">{L.noParams}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {params.map((p) => (
            <ParamField
              key={p.key}
              param={p}
              lang={lang}
              value={values[p.key] ?? ""}
              onChange={(v) => setValues((s) => ({ ...s, [p.key]: v }))}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={ask}
          disabled={busy || missing.length > 0}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? L.asking : L.ask}
        </button>
        {missing.length ? (
          <span className="text-xs text-muted-foreground">{L.fill.replace("{k}", missing.join(", "))}</span>
        ) : null}
      </div>

      {outcome ? <RunReport outcome={outcome} lang={lang} /> : null}
    </section>
  );
}
