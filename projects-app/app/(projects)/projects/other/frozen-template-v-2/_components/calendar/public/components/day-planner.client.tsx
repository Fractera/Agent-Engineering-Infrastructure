"use client";

import { useMemo, useState } from "react";
import { daySlots, type CalRow } from "../../../../_lib/components/calendar";
import { INTEGRATION_ICONS } from "../../../chrome/icons";
import type { Surface } from "../../../surface";
import { pick } from "../../../shared/localized";
import type { EntryType, Tone } from "../../entries";
import { enabledOf, type Integration } from "../../integrations";
import { calendarStrings } from "../../i18n";
import IntegrationDrawer from "./integration-drawer.client";

// ДНЕВНОЙ ПЛАНЕР — правая колонка календаря, перенесённая из v1 один-в-один: дата и счётчики в шапке,
// чипы фильтра под ней, сетка получасовых слотов рабочего дня, записи цветом своего вида. Раскладка
// слотов считается в `_lib/components/calendar` (закон: всё, что не разметка, живёт в `_lib`).
//
// ЧТО ДОБАВЛЕНО К v1 (шаг 292) — ИНТЕГРАЦИИ, И ТОЛЬКО НА СИНИХ СТРОКАХ. Янтарная памятка ничего наружу
// не отправляет: она напоминание владельцу, а не сообщение кому-то. Поэтому иконки каналов появляются
// у СОБЫТИЙ, и по их яркости видно подключение: горит — этот канал у записи включён, приглушена —
// канал у календаря есть, но у этой записи он выключен.
//
// ДВА ВХОДА В ЯЩИК СПРАВА: клик по ИКОНКЕ открывает один канал, клик по ЗАГОЛОВКУ — все сразу.
const CHIP: Record<Tone, string> = {
  event: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  reminder: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

export default function DayPlanner({
  date,
  entries,
  types,
  integrations,
  table,
  surface,
  filter,
  onFilter,
  onRowChange,
  lang,
}: {
  date: string;
  entries: CalRow[];
  types: EntryType[];
  integrations: Integration[];
  table: string;
  surface: Surface;
  filter: string;
  onFilter: (key: string) => void;
  onRowChange: (row: CalRow) => void;
  lang: string;
}) {
  const L = calendarStrings(lang);
  const channels = enabledOf(integrations);
  const [open, setOpen] = useState<{ row: CalRow; only: string | null } | null>(null);

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
                  const tone = toneOf(e.type);
                  const isEvent = tone === "event";
                  return (
                    <div key={e.id} className={`rounded px-2 py-1 text-sm ${CHIP[tone]}`}>
                      <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
                        <span className="font-mono text-[11px] opacity-70">{e.time}</span>
                        <span className="text-[10px] uppercase opacity-60">{type ? labelOf(type) : e.type}</span>
                        <span aria-hidden>—</span>
                        {/* Заголовок СОБЫТИЯ — вход в ящик со всеми каналами сразу. У памятки заголовок
                            остаётся обычным текстом: открывать ей нечего. */}
                        {isEvent && channels.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setOpen({ row: e, only: null })}
                            className="min-w-0 flex-1 truncate text-left underline-offset-2 hover:underline"
                          >
                            {e.title}
                          </button>
                        ) : (
                          <span className="min-w-0 flex-1 truncate">{e.title}</span>
                        )}

                        {isEvent
                          ? channels.map((i) => {
                              const Icon = INTEGRATION_ICONS[i.key];
                              if (!Icon) return null;
                              const on = Boolean(e.integrations[i.key]?.active);
                              return (
                                <button
                                  key={i.key}
                                  type="button"
                                  title={pick(i.label, lang) || i.key}
                                  aria-label={pick(i.label, lang) || i.key}
                                  onClick={() => setOpen({ row: e, only: i.key })}
                                  className={`shrink-0 rounded p-0.5 hover:bg-black/5 dark:hover:bg-white/10 ${on ? "opacity-100" : "opacity-30"}`}
                                  data-integration-icon={i.key}
                                  data-active={on ? "yes" : "no"}
                                >
                                  <Icon className="size-3.5" />
                                </button>
                              );
                            })
                          : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <IntegrationDrawer
        row={open?.row ?? null}
        only={open?.only ?? null}
        table={table}
        integrations={channels}
        surface={surface}
        lang={lang}
        onClose={() => setOpen(null)}
        onSaved={onRowChange}
      />
    </div>
  );
}
