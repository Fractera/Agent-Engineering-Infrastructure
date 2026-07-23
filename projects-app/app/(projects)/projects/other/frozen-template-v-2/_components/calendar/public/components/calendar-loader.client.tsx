"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { groupByDate, shiftMonth, toCalRows, ymd, type CalRow } from "../../../../_lib/components/calendar";
import type { CronSettings } from "../../../cron/schedule";
import type { Surface } from "../../../surface";
import type { EntryType } from "../../entries";
import type { Integration } from "../../integrations";
import { calendarStrings } from "../../i18n";
import MonthGrid from "./month-grid.client";
import DayPlanner from "./day-planner.client";
import DueWatch from "./due-watch.client";

// ЗАГРУЗЧИК КАЛЕНДАРЯ — идёт за записями В СВОЮ ДВЕРЬ `api/rows` и только тогда рисует календарь.
// Монтируется ВНУТРИ ленивого блока, поэтому запрос уходит не раньше, чем раздел попал в поле зрения —
// тот же закон, что у строк дашборда (владелец 2026-07-22).
//
// ЗДЕСЬ ЖИВЁТ ВСЁ ОБЩЕЕ СОСТОЯНИЕ КАЛЕНДАРЯ, и только оно: сами записи, показанный месяц, выбранный
// день, фильтр видов. Обе колонки — сетка месяца и дневной планер — читают его сверху и ничего своего
// не помнят: клик по дню в левой колонке обязан менять правую, а две памяти о выбранном дне неминуемо
// разойдутся. По той же причине правка записи в ящике интеграций возвращается СЮДА (`replaceRow`):
// иначе сетка и планер показывали бы разные версии одной записи.
//
// Дверь адресуется ОТНОСИТЕЛЬНО текущего пути — без хардкода слага (закон 0: папка переносима).
export default function CalendarLoader({
  table,
  types,
  integrations,
  cron,
  surface,
  lang,
}: {
  table: string;
  types: EntryType[];
  integrations: Integration[];
  /** Такт расписания или `null`, если крона нет: тогда сторож не работает вовсе. */
  cron: CronSettings | null;
  surface: Surface;
  lang: string;
}) {
  const L = calendarStrings(lang);
  const [rows, setRows] = useState<CalRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  const now = useMemo(() => new Date(), []);
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState<string>(ymd(now.getFullYear(), now.getMonth(), now.getDate()));
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const apiBase = location.pathname.replace(/\/+$/, "") + "/api";
        const r = await fetch(`${apiBase}/rows?table=${encodeURIComponent(table)}`, { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const d = (await r.json()) as { rows: Record<string, unknown>[] };
        if (alive) setRows(toCalRows(d.rows ?? []));
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => { alive = false; };
  }, [table]);

  const replaceRow = useCallback((next: CalRow) => {
    setRows((list) => (list ?? []).map((r) => (r.id === next.id ? next : r)));
  }, []);

  const byDate = useMemo(() => groupByDate(rows ?? []), [rows]);

  if (failed) return <p className="py-2 text-sm text-rose-700 dark:text-rose-400">{L.loadFailed}</p>;
  if (rows === null) {
    return (
      <div className="flex min-h-24 items-center justify-center">
        <span className="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      </div>
    );
  }
  // Пусто и «не смогли» — разные вещи, и говорим о них разными словами (перенос v1).
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground" data-calendar-view="empty">{L.emptyAutomation}</p>;
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start" data-calendar-view="grid">
        <MonthGrid
          view={view}
          onShift={(delta) => setView((v) => shiftMonth(v, delta))}
          byDate={byDate}
          types={types}
          selected={selected}
          onSelect={setSelected}
          lang={lang}
        />
        <DayPlanner
          date={selected}
          entries={byDate.get(selected) ?? []}
          types={types}
          integrations={integrations}
          table={table}
          surface={surface}
          filter={filter}
          onFilter={setFilter}
          onRowChange={replaceRow}
          lang={lang}
        />
      </div>
      {/* СТОРОЖ живёт рядом с данными, а не внутри колонки: он следит за ВСЕМИ записями календаря, а не
          за выбранным днём, и его тосты принадлежат странице, а не правой колонке. */}
      <DueWatch rows={rows} cron={cron} types={types} lang={lang} />
    </>
  );
}
