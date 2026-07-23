"use client";

import { useMemo } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "../../../chrome/icons";
import { monthCells, type CalRow } from "../../../../_lib/components/calendar";
import type { EntryType, Tone } from "../../entries";
import { calendarStrings } from "../../i18n";

// СЕТКА МЕСЯЦА — левая колонка календаря, перенесённая из v1 один-в-один: 300px, стрелки по краям
// шапки, название месяца с годом посередине, неделя с ПОНЕДЕЛЬНИКА, точка под днём там, где есть
// записи (синяя — событие, янтарная — напоминание), выбранный день залит основным цветом.
//
// Она НИЧЕГО НЕ ПОМНИТ: показанный месяц и выбранный день приходят сверху от загрузчика, туда же уходят
// клики. Своя память о выбранном дне разошлась бы с памятью планера — а это один и тот же день.
//
// НАЗВАНИЯ МЕСЯЦА И ДНЕЙ НЕДЕЛИ даёт `Intl.DateTimeFormat` по языку страницы (закон v1): рантайм знает
// их для всех языков, руками переведённый список рано или поздно оставит пустую подпись.
const DOT: Record<Tone, string> = { event: "bg-blue-500", reminder: "bg-amber-500" };

export default function MonthGrid({
  view,
  onShift,
  byDate,
  types,
  selected,
  onSelect,
  lang,
}: {
  view: { y: number; m: number };
  onShift: (delta: number) => void;
  byDate: Map<string, CalRow[]>;
  types: EntryType[];
  selected: string;
  onSelect: (date: string) => void;
  lang: string;
}) {
  const L = calendarStrings(lang);
  const locale = lang.slice(0, 2);
  const monthFmt = useMemo(() => new Intl.DateTimeFormat(locale, { month: "long" }), [locale]);
  const weekdayFmt = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: "short" }), [locale]);

  // Понедельник первым — как в v1: 2024-01-01 был понедельником, от него и отсчитываем подписи.
  const weekdayLabels = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekdayFmt.format(new Date(2024, 0, 1 + i))),
    [weekdayFmt],
  );

  const cells = useMemo(() => monthCells(view), [view]);

  return (
    <div className="w-full rounded-lg border p-3 sm:w-[300px] sm:shrink-0" data-calendar-part="month">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => onShift(-1)} className="rounded p-1 hover:bg-muted" aria-label={L.prevMonth}>
          <ChevronLeftIcon className="size-4" />
        </button>
        <span className="text-sm font-medium capitalize">
          {monthFmt.format(new Date(view.y, view.m, 1))} {view.y}
        </span>
        <button type="button" onClick={() => onShift(1)} className="rounded p-1 hover:bg-muted" aria-label={L.nextMonth}>
          <ChevronRightIcon className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] capitalize text-muted-foreground">
        {weekdayLabels.map((w, i) => (
          <div key={i} className="py-0.5">{w}</div>
        ))}
      </div>

      <div className="mt-0.5 grid grid-cols-7 gap-0.5 text-center text-xs">
        {cells.map((c, i) => {
          if (!c) return <div key={i} />;
          const list = byDate.get(c.date) ?? [];
          // По точке на КАЖДЫЙ цвет, который есть в этот день — не больше одной на цвет.
          const tones: Tone[] = [];
          for (const t of types) {
            if (list.some((e) => e.type === t.key) && !tones.includes(t.tone)) tones.push(t.tone);
          }
          // Незнакомый вид получает цвет события: цвет — оформление, а не повод пропасть с сетки.
          if (list.some((e) => !types.some((t) => t.key === e.type)) && !tones.includes("event")) tones.push("event");
          const isSel = c.date === selected;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(c.date)}
              className={`relative aspect-square rounded hover:bg-muted ${isSel ? "bg-primary text-primary-foreground" : ""}`}
            >
              {c.day}
              {tones.length > 0 && (
                <span className="absolute bottom-0.5 left-1/2 flex -translate-x-1/2 gap-0.5">
                  {tones.map((t, k) => (
                    <span key={k} className={`size-1 rounded-full ${DOT[t]}`} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
