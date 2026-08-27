// Верёвочка с бусинами — полоса прогресса мастера запуска (шаг 25-2).
//
// 🔒 СЕРВЕРНЫЙ КОМПОНЕНТ, А НЕ ОСТРОВОК. ТЗ подшага называло `.client.tsx`, и это
// оказалось лишним: у полосы нет ни одного обработчика, всё её поведение —
// раскраска по состоянию и одна CSS-анимация. Островок здесь стоил бы JS в
// браузере ради того, что рисуется разметкой. Отступление от ТЗ названо вслух в
// итоге подшага, а не сделано молча.
//
// 🔒 ЧИСЛО БУСИН НЕ ПИШЕТСЯ РУКАМИ. Оно приходит из `launchSteps(mode).length` —
// 13 у стартового шаблона, 14 у чужого проекта. Добавили шаг в
// `lib/launch.shared.ts` — полоса удлинилась сама. Захардкоженное число разошлось
// бы с правдой ровно в тот день, когда шагов станет больше.
//
// 🔒 АНИМАЦИЯ УВАЖАЕТ `prefers-reduced-motion`. Зелёная часть верёвочки вырастает
// от нуля до пройденной доли при каждом показе страницы: это читается как
// «продвинулись», а не мигает. При включённом запрете движения — сразу конечная
// ширина, без роста.

import { Check } from "lucide-react";

export type BeadsLabels = {
  /** Шаблон вида «Шаг {n} из {total}». */
  stepOf: string;
};

const fill = (t: string, v: Record<string, string | number>) =>
  t.replace(/\{(\w+)\}/g, (m, k) => String(v[k] ?? m));

export function StepBeads(
  { done, current, labels }:
  { done: readonly boolean[]; current: number; labels: BeadsLabels },
) {
  // 🔒 БУСИНЫ КРАСЯТСЯ ПОШТУЧНО, А НЕ ПЕРВЫЕ N. Первая редакция принимала
  // `doneCount` и заливала префикс — то есть считала, что пройденные шаги всегда
  // идут подряд. Это неправда по устройству: отметка `checked`-шага снимаемая, и
  // `readLaunch` прямо оговаривает случай «снял галочку с пятого, пройдя девятый».
  // Префиксная заливка в этот момент врала бы: зелёным горел бы первый шаг,
  // который на самом деле открыт.
  const total = done.length;
  const doneCount = done.filter(Boolean).length;

  // `current` 0-based и равен `total`, когда пройдено всё. Человеку показываем
  // номер шага, на котором он стоит; на финале — последний, а не «14 из 13».
  const humanIndex = Math.min(current + 1, total);
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="rounded-lg border border-border px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium text-foreground">
          {fill(labels.stepOf, { n: humanIndex, total })}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">{pct}%</p>
      </div>

      {/* Верёвочка: серая нить, поверх неё растущая зелёная. Бусины сидят на ней. */}
      <div className="relative mt-2.5">
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-border" aria-hidden />
        <div
          className="launch-rope absolute left-0 top-1/2 h-px -translate-y-1/2 bg-green-500/70"
          style={{ ["--rope" as string]: `${pct}%` }}
          aria-hidden
        />

        <ol className="relative flex items-center justify-between gap-0.5">
          {done.map((isDone, i) => {
            const here = i === current;
            return (
              <li
                key={i}
                className={
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[8px] " +
                  (isDone
                    ? "border-green-500 bg-green-500 text-white"
                    : here
                      ? "border-orange-500 bg-background text-orange-600 dark:text-orange-400"
                      : "border-border bg-background text-muted-foreground/60")
                }
                aria-current={here ? "step" : undefined}
              >
                {isDone ? <Check size={9} strokeWidth={3} /> : i + 1}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
