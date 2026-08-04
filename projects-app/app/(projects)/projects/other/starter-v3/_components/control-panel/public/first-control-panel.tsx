"use client";

import { useState } from "react";
import type { Entity } from "../../../_data/automation.schema";
import { controlPanelStrings, pick } from "../i18n";
import { paramsOf, dataText } from "../params";
import type { Task } from "../tasks";
import ParamField from "./components/param-field.client";
import RunReport, { type Outcome } from "./components/run-report.client";
import { notifyRunCompleted } from "../../shared/run-events";
import { Button } from "@/components/ui/button";

// ПЕРВЫЙ ПУЛЬТ ЗАПУСКА — публичная половина вкладки: поля запроса, кнопка и результат. Только
// использование. Поверхность одна — кокпит (шаг 300: `?view=public`/`surface` удалены): пульт —
// рабочий инструмент внутри аккордеона, компактный, с цепочкой узлов под формой.
//
// ОДИН ФАЙЛ ЭТОЙ ПАПКИ = ОДИН ПУЛЬТ. Второй пульт вкладки ляжет рядом (`second-control-panel.tsx`) и
// возьмёт те же общие компоненты из `components/`. Сколько пультов — решает ядро (entities вкладки).
//
// Что спрашивать — сказано в ядре (`entity.data.params`), здесь только рисуется. Запуск идёт в
// собственную дверь `api/run` ОТНОСИТЕЛЬНО текущего пути (закон 0: папка переносима).
export default function FirstControlPanel({
  entity,
  lang,
  heading = true,
  tasks = [],
}: {
  entity: Entity;
  lang: string;
  /** Рисовать ли имя пульта: во вложенном аккордеоне оно уже стоит в шапке, второй раз не нужно. */
  heading?: boolean;
  /** Задачи автоматизации — выведены из кейсов ядра сервером (`tasks.ts`). Пусто → кнопок нет. */
  tasks?: Task[];
}) {
  const L = controlPanelStrings(lang);
  const params = paramsOf(entity);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // ВЫБРАННАЯ ЗАДАЧА — не украшение: она уезжает в прогон и говорит слоям, какой кейс исполняется.
  const [task, setTask] = useState<Task | null>(null);

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
        // `taskCase` — какой кейс человек выбрал. Прогон получает это ЗНАНИЕМ, а не догадкой: проверять
        // покрытие больше нечего, человек выбрал из того, что автоматизация умеет.
        //
        // 🔒 `lang` — ЯЗЫК СТРАНИЦЫ, НА КОТОРУЮ ЧЕЛОВЕК СМОТРИТ (332.E, дефект найден владельцем живьём).
        // Панель не сообщала его вовсе, и прогон угадывал язык ответа по АЛФАВИТУ первого сообщения:
        // владелец открыл русскую страницу, написал «hello» — и машина записала себе «этот чат
        // английский», после чего отвечала по-английски человеку, читающему русский интерфейс. Язык, на
        // котором человек читает страницу, — это факт, а не догадка, и его надо передавать, а не выводить.
        body: JSON.stringify({ input: { ...values, lang, ...(task ? { taskCase: task.cuid } : {}) } }),
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
      {heading ? (
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}

      {/* 🔒 СПИСОК ЗАДАЧ — ГЛАВНЫЙ ПУТЬ (доктрина масштаба). Стоит НАД полем: человек видит, на что
          автоматизация способна, ещё до первого слова. Прятать 2–5 пунктов за кнопкой не надо — это
          лишний клик без выигрыша; кнопка-раскрытие оправдана от семи-восьми пунктов, а их не будет. */}
      {tasks.length ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{L.tasks}</p>
          {/* 🔒 КНОПКА ОБЯЗАНА БЫТЬ ПОНЯТНОЙ БЕЗ ПОЯСНЕНИЙ (332.E, найдено владельцем живьём). Здесь подпись
              резалась в одну строку, и владелец увидел «Open up a named…» — обрубок чужого предложения на
              русском экране, «не понимаю, что это за кнопка и зачем». Подпись — ДАННЫЕ владельца (заголовок
              кейса) и переводу не подлежит, поэтому лечится два раза: заголовок показывается ЦЕЛИКОМ (перенос
              по словам, а не многоточие), а НАД рядом стоит фраза на языке интерфейса, объясняющая, что это
              вообще такое. Данные могут быть на любом языке — объяснение обязано быть на языке читателя. */}
          <p className="text-xs text-muted-foreground">{L.tasksHint}</p>
          <div className="flex flex-wrap gap-1.5">
            {tasks.map((t) => (
              <Button
                key={t.cuid}
                type="button"
                size="sm"
                variant={task?.cuid === t.cuid ? "default" : "outline"}
                disabled={busy}
                onClick={() => setTask(task?.cuid === t.cuid ? null : t)}
                className="h-auto max-w-full whitespace-normal text-left leading-snug py-1.5"
              >
                {t.number}. {t.title}
              </Button>
            ))}
          </div>
          {task ? <p className="text-xs text-muted-foreground">{task.text}</p> : null}
        </div>
      ) : null}

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
        <Button type="button" onClick={ask} disabled={busy || missing.length > 0} size="sm">
          {busy ? L.asking : L.ask}
        </Button>
        {missing.length ? (
          <span className="text-xs text-muted-foreground">{L.fill.replace("{k}", missing.join(", "))}</span>
        ) : null}
      </div>

      {/* Цепочка узлов прогона — знание владельца: отчёт по каждому узлу, отказы и причины. */}
      {outcome ? <RunReport outcome={outcome} lang={lang} /> : null}
    </section>
  );
}
