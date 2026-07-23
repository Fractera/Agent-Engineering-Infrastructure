"use client";

import { useMemo } from "react";
import { daySlots, type CalRow } from "../../../../_lib/components/calendar";
import type { EntryType, Tone } from "../../entries";
import { calendarStrings } from "../../i18n";
import { pick } from "../../../shared/localized";

// ДНЕВНОЙ ПЛАНЕР — правая колонка календаря, перенесённая из v1 один-в-один: дата и счётчики в шапке,
// чипы фильтра под ней, сетка получасовых слотов рабочего дня, записи цветом своего вида.
//
// Она НИЧЕГО НЕ ПОМНИТ: день и фильтр приходят сверху от загрузчика — см. его комментарий. Раскладка
// слотов считается в `_lib/components/calendar` (закон: всё, что не разметка, живёт в `_lib`).
const CHIP: Record<Tone, string> = {
  event: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  reminder: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

export default function DayPlanner({
  date,
  entries,
  types,
  filter,
  onFilter,
  lang,
}: {
  date: string;
  entries: CalRow[];
  types: EntryType[];
  filter: string;
  onFilter: (key: string) => void;
  lang: string;
}) {
  const L = calendarStrings(lang);

  // ПОДПИСЬ ВНУТРИ ЗАПИСИ — как её назвало ядро («событие»), иначе словарь, иначе сам ключ:
  // безымянный вид лучше показать ключом, чем пустотой.
  const labelOf = (t: EntryType): string =>
    pick(t.label, lang) || (t.key === "event" ? L.typeEvent : t.key === "reminder" ? L.typeReminder : t.key);
  // ПОДПИСЬ ЧИПА ФИЛЬТРА — другое слово, и это не мелочь: у записи стоит «событие», а у чипа «События».
  // Для двух известных видов авторитет у словаря вкладки (так было в v1), у своего вида — у ядра.
  const filterLabelOf = (t: EntryType): string =>
    t.key === "event" ? L.filterEvents : t.key === "reminder" ? L.filterReminders : pick(t.label, lang) || t.key;

  const toneOf = (key: string): Tone => types.find((t) => t.key === key)?.tone ?? "event";

  const reminderCount = entries.filter((e) => toneOf(e.type) === "reminder").length;
  const eventCount = entries.filter((e) => toneOf(e.type) === "event").length;
  const shown = entries.filter((e) => filter === "all" || e.type === filter);
  const slots = useMemo(() => daySlots(shown), [shown]);

  return (
    <div className="w-full rounded-lg border p-3 sm:flex-1" data-calendar-part="day">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{date || L.pickDate}</p>
        <span className="text-xs text-muted-foreground">
          {reminderCount} {L.reminderCountLabel} · {eventCount} {L.eventCountLabel}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {[{ key: "all", label: L.filterAll }, ...types.map((t) => ({ key: t.key, label: filterLabelOf(t) }))].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => onFilter(f.key)}
            className={`rounded px-2 py-0.5 text-xs ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-xs text-muted-foreground">{L.emptyDay}</p>
      ) : (
        <div className="divide-y">
          {slots.map((s) => (
            <div key={s.min} className="flex min-h-7 items-start gap-2 py-1">
              <span className="w-10 shrink-0 font-mono text-[11px] leading-5 text-muted-foreground">{s.label}</span>
              <div className="flex-1 space-y-1">
                {s.items.map((e) => {
                  const type = types.find((t) => t.key === e.type);
                  return (
                    <div key={e.id} className={`rounded px-2 py-1 text-sm ${CHIP[toneOf(e.type)]}`}>
                      <span className="font-mono text-[11px] opacity-70">{e.time}</span>{" "}
                      <span className="text-[10px] uppercase opacity-60">{type ? labelOf(type) : e.type}</span>{" "}
                      — {e.title}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
