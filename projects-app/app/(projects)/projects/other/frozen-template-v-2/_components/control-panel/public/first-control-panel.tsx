"use client";

import { useState } from "react";
import type { Entity } from "../../../_data/automation.schema";
import type { Surface } from "../../surface";
import { controlPanelStrings, pick } from "../i18n";
import { paramsOf, dataText } from "../params";
import ParamField from "./components/param-field.client";
import RunReport, { type Outcome, readError } from "./components/run-report.client";
import { notifyRunCompleted } from "../../shared/run-events";
import Toast, { type ToastTone } from "../../shared/toast.client";

// ПЕРВЫЙ ПУЛЬТ ЗАПУСКА — публичная половина вкладки: поля запроса, кнопка и результат. Только
// использование. Виден на обеих поверхностях: посетителю — как вся вкладка, владельцу — как её верхняя
// половина (образец v1: активация есть использование, а не управление).
//
// ОДИН ФАЙЛ ЭТОЙ ПАПКИ = ОДИН ПУЛЬТ. Второй пульт вкладки ляжет рядом (`second-control-panel.tsx`) и
// возьмёт те же общие компоненты из `components/`. Сколько пультов — решает ядро (entities вкладки).
//
// Что спрашивать — сказано в ядре (`entity.data.params`), здесь только рисуется. Запуск идёт в
// собственную дверь `api/run` ОТНОСИТЕЛЬНО текущего пути (закон 0: папка переносима).
export default function FirstControlPanel({
  entity,
  lang,
  surface,
  heading = true,
}: {
  entity: Entity;
  lang: string;
  surface: Surface;
  /** Рисовать ли имя пульта: во вложенном аккордеоне оно уже стоит в шапке, второй раз не нужно. */
  heading?: boolean;
}) {
  const L = controlPanelStrings(lang);
  const params = paramsOf(entity);
  // ДВА ОБЛИКА ОДНОГО ПУЛЬТА (образец v1). На ВИТРИНЕ пульт — это ФОРМА ЗАЯВКИ лендинга: карточка по
  // центру, крупный заголовок, поля в одну колонку, широкая кнопка призыва, а ответ — тостом. В КОКПИТЕ —
  // рабочий инструмент внутри аккордеона: компактно, две колонки, цепочка узлов под формой. Логика одна и
  // та же — разное только оформление, поэтому второй компонент не нужен.
  const landing = surface === "public";
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: ToastTone; auto?: number } | null>(null);

  const missing = params.filter((p) => p.required && !String(values[p.key] ?? "").trim()).map((p) => p.key);

  // ОТВЕТ ПОСЕТИТЕЛЮ — строка, СОБРАННАЯ ПО ШАБЛОНУ ИЗ ЯДРА (`entity.data.answer`, десять языков):
  // «{company} ({ticker}) — {price} $». Шаблон в ядре, а не в компоненте, потому что пульт — общий
  // примитив: у другой автоматизации ответ другой, а код тот же. Цена округляется до копеек.
  function answerText(context: Record<string, unknown>): string {
    const tpl = pick(dataText(entity, "answer"), lang);
    if (!tpl) return "";
    return tpl.replace(/\{(\w+)\}/g, (_, key: string) => {
      const v = context[key];
      return typeof v === "number" ? v.toFixed(2) : String(v ?? "");
    });
  }

  async function ask() {
    if (missing.length) return;
    setBusy(true);
    setOutcome(null);
    setToast(null);
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

      // ВИТРИНА ОТВЕЧАЕТ ЧЕЛОВЕКУ, А НЕ ОТЧИТЫВАЕТСЯ: вместо цепочки узлов — тост с самим ответом
      // (зелёный, гаснет сам через три секунды). Отказ тоже тостом, но красным и БЕЗ автозакрытия:
      // причину нужно успеть прочитать. Цепочка узлов остаётся кокпиту владельца.
      if (landing) {
        if ("refusal" in result) {
          setToast({ text: L.refused.replace("{k}", result.refusal), tone: "fail" });
        } else if (result.ok) {
          const text = answerText(result.context ?? {});
          setToast({ text: text || L.done, tone: "ok", auto: 3000 });
        } else {
          setToast({ text: readError(result.error, lang) || L.failed, tone: "fail" });
        }
      }
    } catch (e) {
      const text = e instanceof Error ? e.message : String(e);
      setOutcome({ ok: false, nodes: [], error: text });
      if (landing) setToast({ text, tone: "fail" });
    } finally {
      setBusy(false);
    }
  }

  const title = pick(dataText(entity, "title"), lang) || entity.name;
  const description = pick(dataText(entity, "description"), lang);

  return (
    <section
      data-control-panel="public"
      data-entity-cuid={entity.cuid}
      className={landing ? "mx-auto max-w-2xl space-y-5 rounded-xl border bg-card p-6 shadow-sm" : "space-y-3 py-2"}
    >
      {heading ? (
      <div className={landing ? "space-y-2 text-center" : "space-y-1"}>
        <h3 className={landing ? "text-2xl font-bold tracking-tight" : "text-base font-semibold text-foreground"}>{title}</h3>
        {description ? (
          <p className={landing ? "text-sm text-muted-foreground" : "text-sm text-muted-foreground"}>{description}</p>
        ) : null}
      </div>
      ) : null}

      {params.length === 0 ? (
        <p className="text-sm text-muted-foreground">{L.noParams}</p>
      ) : (
        <div className={landing ? "grid gap-4" : "grid gap-3 md:grid-cols-2"}>
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

      <div className={landing ? "space-y-2" : "flex items-center gap-3"}>
        <button
          type="button"
          onClick={ask}
          disabled={busy || missing.length > 0}
          className={
            landing
              ? "w-full rounded-lg bg-primary px-4 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              : "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          }
        >
          {busy ? L.asking : L.ask}
        </button>
        {missing.length ? (
          <span className={landing ? "block text-center text-xs text-muted-foreground" : "text-xs text-muted-foreground"}>
            {L.fill.replace("{k}", missing.join(", "))}
          </span>
        ) : null}
      </div>

      {/* Цепочка узлов — знание владельца: на витрине её нет, там ответ говорит тост. */}
      {outcome && !landing ? <RunReport outcome={outcome} lang={lang} /> : null}
      {toast ? (
        <Toast text={toast.text} tone={toast.tone} autoCloseMs={toast.auto} onClose={() => setToast(null)} />
      ) : null}
    </section>
  );
}
