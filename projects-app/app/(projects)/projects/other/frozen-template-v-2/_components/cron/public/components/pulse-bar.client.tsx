"use client";

import { useEffect, useState } from "react";
import { secondsLeft } from "../../schedule";
import { cronStrings } from "../../i18n";

// ПОЛОСА-ПУЛЬС — перенос идиомы v1 (`_shared/components/cron-progress-bar.client.tsx`) внутрь папки
// (закон 0). Оранжевая полоса убывает слева направо за ОДИН период расписания и сбрасывается: это
// живой пульс, скорость которого И ЕСТЬ период этой автоматизации.
//
// ПОКАЗЫВАЕТСЯ ТОЛЬКО ПРИ ВКЛЮЧЁННОМ РАСПИСАНИИ — правило владельца из v1: выключенный крон не должен
// изображать работу.
//
// Отсчёт выровнен по стенным часам (`secondsLeft`), а не от момента загрузки страницы: полоса на
// витрине и полоса в кокпите обязаны показывать ОДИН И ТОТ ЖЕ момент следующей проверки — иначе
// владелец видит два разных «скоро» для одного и того же события.
//
// ЧТО ЭТО ЗНАЧИТ (читать перед правкой, тот же примечательный абзац, что в v1): полоса изображает
// ИСХОДЯЩУЮ, плановую сторону — напомнить о наступившем, опросить календарь, сделать периодическую
// проверку. О ВХОДЯЩИХ событиях она не говорит ничего: те приходят мгновенно через push-канал и к
// этому таймеру отношения не имеют.
export default function PulseBar({ everyMinutes, enabled, lang }: { everyMinutes: number; enabled: boolean; lang: string }) {
  const L = cronStrings(lang);
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
    <div data-cron="pulse" className="space-y-1">
      <div className="h-0.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-orange-500 transition-[width] duration-1000 ease-linear" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        {L.every.replace("{n}", String(everyMinutes))} · {L.nextIn.replace("{n}", String(left))}
      </p>
    </div>
  );
}
