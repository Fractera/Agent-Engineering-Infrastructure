"use client";

import { useEffect, useState } from "react";
import { secondsLeft } from "../../schedule";

// ВЕРХНЯЯ ПОЛОСА-ПУЛЬС — живой индикатор такта, ЗАКРЕПЛЁННЫЙ вверху страницы (правка владельца
// 2026-07-23). Это тот самый «слайдер» из раздела крона, вынесенный наружу: тонкая оранжевая полоса на
// всю ширину, убывающая слева направо за ОДИН период и сбрасывающаяся — пульс, скорость которого И ЕСТЬ
// период автоматизации. Идиома перенесена из v1 (`_shared/cron-progress-bar`, шаг 218/234).
//
// ПОЗИЦИЯ. `fixed` на 1px ниже хедера зоны (хедер = `h-14` = 56px, `sticky top-0 z-40`), поэтому полоса
// всегда видна вверху при любой прокрутке и не перекрывает хедер (`z-30` — под ним). Полная ширина.
//
// ПОКАЗЫВАЕТСЯ ТОЛЬКО ПРИ ВКЛЮЧЁННОМ ТАКТЕ — правило владельца из v1: выключенный крон не изображает
// работу. Отсчёт выровнен по стенным часам (`secondsLeft`), а не от загрузки страницы: витрина и кокпит
// показывают ОДИН момент следующей проверки.
//
// ЧТО ЭТО ЗНАЧИТ. Полоса изображает ИСХОДЯЩУЮ, плановую сторону (напомнить о наступившем, опросить
// календарь). О ВХОДЯЩИХ событиях она не говорит: те приходят мгновенно push-каналом, к таймеру
// отношения не имеют.
export default function TopPulseBar({ everyMinutes, enabled }: { everyMinutes: number; enabled: boolean }) {
  const [left, setLeft] = useState(() => secondsLeft(everyMinutes));

  useEffect(() => {
    if (!enabled) return;
    const tick = () => setLeft(secondsLeft(everyMinutes));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [enabled, everyMinutes]);

  if (!enabled) return null;

  const period = Math.max(1, everyMinutes) * 60;
  const percent = Math.round((left / period) * 100);

  return (
    <div data-cron="top-pulse" className="fixed inset-x-0 top-[57px] z-30 h-0.5 overflow-hidden bg-muted/60" aria-hidden>
      <div className="h-full bg-orange-500 transition-[width] duration-1000 ease-linear" style={{ width: `${percent}%` }} />
    </div>
  );
}
