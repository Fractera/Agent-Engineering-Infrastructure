"use client";

import { useState } from "react";
import type { Entity } from "../../_data/automation.schema";
import { controlPanelStrings, pick } from "./i18n";

// ПУЛЬТ ЗАПУСКА ПУБЛИЧНЫЙ — сам пульт: поля запроса, кнопка и результат. Только использование.
// Виден на обеих поверхностях: посетителю — как вся вкладка, владельцу — как её верхняя половина
// (образец v1: активация = использование, а не управление).
//
// ОДИН ФАЙЛ = ОДИН ПУЛЬТ. Вкладка `control-panel` может нести много пультов — они лежат рядом
// (`second-control-panel.tsx` и т.д.) и подключаются в маршрутизаторе `index.tsx`; ядро (entities вкладки)
// решает, сколько их и что каждый спрашивает.
//
// Форма ВЫВЕДЕНА ИЗ ЯДРА: `entity.data.params` — перечень полей (как дашборд объявляет колонки таблицы).
// Ничего не захардкожено: добавили поле в ядро через api/patch — оно появилось в пульте без пересборки.
// Запуск идёт в собственную дверь `api/run` ОТНОСИТЕЛЬНО текущего пути (закон 0: папка переносима).
type Param = {
  key: string;
  type?: "text" | "longtext" | "number";
  required?: boolean;
  label?: unknown;
  placeholder?: unknown;
};

type NodeReport = { cuid: string; name: string; fn: string; status: "ok" | "stopped" | "fail"; error?: string };
type Report = { ok: boolean; nodes: NodeReport[]; error?: string } | { refusal: string } | null;

/** Ошибка узла приходит либо строкой, либо JSON-картой десяти языков (так бросает `receiveRequest`). */
function readError(raw: unknown, lang: string): string {
  const s = String(raw ?? "");
  if (!s.startsWith("{")) return s;
  try {
    return pick(JSON.parse(s), lang) || s;
  } catch {
    return s;
  }
}

export function paramsOf(entity: Entity): Param[] {
  const raw = (entity.data as Record<string, unknown>).params;
  return Array.isArray(raw) ? (raw as Param[]) : [];
}

export default function FirstControlPanel({ entity, lang }: { entity: Entity; lang: string }) {
  const L = controlPanelStrings(lang);
  const params = paramsOf(entity);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report>(null);

  const missing = params.filter((p) => p.required && !String(values[p.key] ?? "").trim()).map((p) => p.key);

  async function ask() {
    if (missing.length) return;
    setBusy(true);
    setReport(null);
    try {
      const apiBase = location.pathname.replace(/\/+$/, "") + "/api";
      const r = await fetch(`${apiBase}/run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: values }),
      });
      setReport((await r.json()) as Report);
    } catch (e) {
      setReport({ ok: false, nodes: [], error: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  const title = pick((entity.data as Record<string, unknown>).title, lang) || entity.name;
  const description = pick((entity.data as Record<string, unknown>).description, lang);

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
          {params.map((p) => {
            const label = pick(p.label, lang) || p.key;
            const placeholder = pick(p.placeholder, lang);
            const wide = p.type === "longtext" ? "md:col-span-2" : "";
            return (
              <label key={p.key} className={`space-y-1 ${wide}`}>
                <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  {label}
                  <span className="text-[10px] uppercase tracking-wide opacity-70">
                    {p.required ? L.required : L.optional}
                  </span>
                </span>
                {p.type === "longtext" ? (
                  <textarea
                    value={values[p.key] ?? ""}
                    placeholder={placeholder}
                    onChange={(e) => setValues((s) => ({ ...s, [p.key]: e.target.value }))}
                    className="min-h-20 w-full resize-y rounded-md border bg-transparent p-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                ) : (
                  <input
                    type={p.type === "number" ? "number" : "text"}
                    value={values[p.key] ?? ""}
                    placeholder={placeholder}
                    onChange={(e) => setValues((s) => ({ ...s, [p.key]: e.target.value }))}
                    className="h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                )}
              </label>
            );
          })}
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

      {report ? (
        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          {"refusal" in report ? (
            <p className="text-sm text-rose-700 dark:text-rose-400">{L.refused.replace("{k}", report.refusal)}</p>
          ) : (
            <>
              {report.error ? (
                <p className="text-sm text-rose-700 dark:text-rose-400">{readError(report.error, lang)}</p>
              ) : (
                <p className="text-sm text-emerald-700 dark:text-emerald-400">{L.done}</p>
              )}
              {/* Цепочка узлов прогона — как в v1: по чипу на узел, зелёный/красный по исходу. */}
              <div className="flex flex-wrap gap-2">
                {report.nodes.map((n) => (
                  <span
                    key={n.cuid}
                    title={readError(n.error, lang)}
                    className={`rounded-md border px-2 py-1 text-xs ${
                      n.status === "ok"
                        ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                        : n.status === "stopped"
                          ? "border-border text-muted-foreground"
                          : "border-rose-500/40 text-rose-700 dark:text-rose-400"
                    }`}
                  >
                    {n.name} · {n.status}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
