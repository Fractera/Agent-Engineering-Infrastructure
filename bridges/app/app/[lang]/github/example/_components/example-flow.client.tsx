"use client";

// ХОД ШАГОВ НА ОБРАЗЦЕ (шаг 28-5, 2026-08-27).
//
// 🔒 ЧТО ЭТОТ ОСТРОВОК ПОКАЗЫВАЕТ. Не мастер, а ЗАКОН ЕГО ДВИЖЕНИЯ: на экране
// живёт ровно один открытый шаг, пройденные свёрнуты в строку бусин, будущих не
// видно вовсе. Удача двигает шаг через три секунды; отказ не двигает никуда.
//
// 🔒 ОДНО ДЕЙСТВИЕ — ОДИН ШАГ (владелец, 2026-08-27: «one step for one step»).
// Четыре шага образца — это те самые четыре действия, которые живой мастер
// сегодня требует внутри «шага 1 из 13»: адрес, токен, проверка, отправка.
// Владелец назвал это дефектом: «it must to be 4 steps , not 1». Здесь их
// четыре, и счётчик считает их честно.
//
// 🔒 СЛОВА ШАГОВ ПРИХОДЯТ СНАРУЖИ И НЕ СОЧИНЯЮТСЯ АГЕНТОМ. Решение владельца:
// «step by step together , i give you new text for each». На образце стоят
// заведомо служебные заполнители — по ним сразу видно, что это не текст
// продукта. ✗ иначе моя выдумка незаметно становится текстом продукта.
//
// 🔒 НИЧЕГО НЕ ЗАПИСЫВАЕТСЯ. Ни одной двери `api/config/launch/*`: состояние
// живёт в памяти вкладки и умирает вместе с ней.

import { useState } from "react";
import { StepSection } from "./step-section";
import { StepAction, type StepActionLabels } from "./step-action.client";
import { Small } from "@/components/ui/typography";

export type ExampleStep = {
  badge?: string;
  title: string;
  lead?: string;
  info?: string;
  important?: string;
  actionLead?: string;
  bullets?: string[];
  action: StepActionLabels;
};

export type ExampleFlowLabels = {
  /** Шаблон «Шаг {n} из {total}». */
  stepOf: string;
  /** Подпись отметки завершённости. */
  done: string;
  /** Подпись строки бусин: «пройдено {n} из {total}». */
  progress: string;
  /** Кнопка возврата образца в исходное состояние. */
  restart: string;
  /** Строка, показанная, когда пройдены все шаги. */
  finished: string;
};

const fill = (t: string, v: Record<string, string | number>) =>
  t.replace(/\{(\w+)\}/g, (m, k) => String(v[k] ?? m));

export function ExampleFlow({
  steps,
  labels,
}: {
  steps: ExampleStep[];
  labels: ExampleFlowLabels;
}) {
  // Номер ОТКРЫТОГО шага, считая с нуля. Равен длине списка — пройдены все.
  const [current, setCurrent] = useState(0);

  const total = steps.length;
  const step = steps[current];

  return (
    <div className="flex flex-col gap-6">
      {/* Верёвочка: пройденные шаги свёрнуты в бусины. Она отвечает на вопрос
          «сколько ещё», не показывая содержимого будущих шагов, — показанное
          действие читается как требуемое. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5" aria-hidden>
          {steps.map((s, i) => (
            <span
              key={s.title}
              data-bead={i < current ? "done" : i === current ? "current" : "future"}
              className={[
                "h-1.5 rounded-full transition-all",
                i < current
                  ? "w-8 bg-emerald-500"
                  : i === current
                    ? "w-8 bg-foreground"
                    : "w-4 bg-border",
              ].join(" ")}
            />
          ))}
        </div>
        <Small className="text-muted-foreground">
          {fill(labels.progress, { n: current, total })}
        </Small>
        {current > 0 && (
          <button
            type="button"
            onClick={() => setCurrent(0)}
            className="text-[length:var(--fs-small)] text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {labels.restart}
          </button>
        )}
      </div>

      {step ? (
        <StepSection
          index={current + 1}
          total={total}
          stepOfTemplate={labels.stepOf}
          doneLabel={labels.done}
          badge={step.badge}
          title={step.title}
          lead={step.lead}
          info={step.info}
          important={step.important}
          actionLead={step.actionLead}
          bullets={step.bullets}
        >
          <StepAction
            index={current + 1}
            total={total}
            labels={step.action}
            onDone={() => setCurrent((n) => n + 1)}
          />
        </StepSection>
      ) : (
        // Пройдены все: показываем последний шаг в закрытом виде, чтобы отметка
        // «завершён» была видна не мельком — ради неё сущность и заводилась.
        <StepSection
          index={total}
          total={total}
          stepOfTemplate={labels.stepOf}
          doneLabel={labels.done}
          done
          badge={steps[total - 1].badge}
          title={steps[total - 1].title}
          lead={labels.finished}
        />
      )}
    </div>
  );
}
