"use client";

import { useEffect, useState } from "react";
import { secondsLeft } from "../../schedule";
import { cronStrings } from "../../i18n";

// ОБРАТНЫЙ ОТСЧЁТ РАЗДЕЛА — В САМОЙ автоматизации такт показан ОБЫЧНЫМ ЧИСЛОМ, а не полосой-«лазером»
// (правка владельца 2026-07-23). «Лазер» — живая полоса — переехал наверх страницы фиксированным
// индикатором (`top-pulse-bar.client.tsx`); дублировать его здесь незачем, в разделе нужен точный
// остаток секунд цифрой.
//
// ПОКАЗЫВАЕТСЯ ТОЛЬКО ПРИ ВКЛЮЧЁННОМ РАСПИСАНИИ — правило владельца из v1: выключенный крон не изображает
// работу. Отсчёт выровнен по стенным часам (`secondsLeft`), а не от загрузки страницы: раздел, витрина и
// верхняя полоса показывают ОДИН И ТОТ ЖЕ момент следующей проверки.
//
// ЧТО ЭТО ЗНАЧИТ: число считает ИСХОДЯЩУЮ, плановую сторону — напомнить о наступившем, опросить
// календарь. О ВХОДЯЩИХ событиях оно молчит: те приходят мгновенно push-каналом, к таймеру отношения
// не имеют.
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

  // Обычное число обратного отсчёта: `nextIn` = «следующая проверка через {n} с». Число выделено
  // моноширинным tabular-nums, чтобы ширина не прыгала на каждой секунде.
  const [before, after] = L.nextIn.split("{n}");
  return (
    <p data-cron="countdown" className="text-xs text-muted-foreground">
      {L.every.replace("{n}", String(everyMinutes))} · {before}
      <span className="font-mono tabular-nums text-foreground">{left}</span>
      {after}
    </p>
  );
}
