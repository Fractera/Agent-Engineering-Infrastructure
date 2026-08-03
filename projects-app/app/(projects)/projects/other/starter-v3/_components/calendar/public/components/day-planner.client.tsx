"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EntityDrawer, type DrawerTarget } from "../../../shared/entity-drawer.client";
import { daySlots, type CalRow } from "../../../../_lib/components/calendar";
import { INTEGRATION_ICONS } from "../../../chrome/integration-icons";
import { pick } from "../../../shared/localized";
import type { EntryType, Tone } from "../../entries";
import { enabledOf, missingKeysOf, type Integration } from "../../integrations";
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
  present,
  table,
  filter,
  onFilter,
  onRowChange,
  lang,
}: {
  date: string;
  entries: CalRow[];
  types: EntryType[];
  integrations: Integration[];
  /** Присутствие ключей: канал без них рисуется приглушённым — объявлен, но работать не может. */
  present: Record<string, boolean>;
  table: string;
  filter: string;
  onFilter: (key: string) => void;
  onRowChange: (row: CalRow) => void;
  lang: string;
}) {
  const L = calendarStrings(lang);
  const channels = enabledOf(integrations);
  const [open, setOpen] = useState<{ row: CalRow; only: string | null } | null>(null);
  // Ящик СУЩНОСТИ — общий для всей автоматизации; ящик ИНТЕГРАЦИЙ (`open`) остаётся своим, календарным:
  // первый показывает, ЧТО это за запись, второй настраивает, КУДА она уйдёт.
  const [entity, setEntity] = useState<DrawerTarget>(null);

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
          <Button
            key={f.key}
            type="button"
            variant={filter === f.key ? "default" : "secondary"}
            size="xs"
            onClick={() => onFilter(f.key)}
          >
            {f.label}
          </Button>
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
                        {/* 🔒 ЗАГОЛОВОК ЗАПИСИ ВЕДЁТ К СУЩНОСТИ (шаг 328): событие — такая же ГРАНЬ записи,
                            как метка на карте и объект в хранилище, и клик по нему открывает тот же ящик
                            сущности, что строка любой таблицы. Прежде заголовок открывал ящик ИНТЕГРАЦИЙ;
                            эта дверь не потеряна — она переехала на свою кнопку справа (ниже), потому что
                            один жест не может значить два разных дела. */}
                        <Button
                          type="button"
                          variant="link"
                          onClick={() => setEntity({ table, id: e.id })}
                          className="h-auto min-w-0 flex-1 justify-start truncate p-0 font-normal text-inherit underline-offset-2 hover:underline"
                        >
                          {e.title}
                        </Button>

                        {isEvent
                          ? channels.map((i) => {
                              const Icon = INTEGRATION_ICONS[i.key];
                              if (!Icon) return null;
                              const on = Boolean(e.integrations[i.key]?.active);
                              // ТРИ ЯРКОСТИ, ТРИ СМЫСЛА: горит — канал включён у этой записи и настроен;
                              // полупрозрачна — канал есть, но у записи выключен; самая бледная — ключей
                              // нет, и канал не сработает, сколько его ни включай.
                              const ready = missingKeysOf(i, present).length === 0;
                              const name = pick(i.label, lang) || i.key;
                              return (
                                <Button
                                  key={i.key}
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  title={ready ? name : `${name} — ${L.keysMissing}`}
                                  aria-label={name}
                                  onClick={() => setOpen({ row: e, only: i.key })}
                                  className={cn("size-6 shrink-0", !ready ? "opacity-20" : on ? "opacity-100" : "opacity-40")}
                                  data-integration-icon={i.key}
                                  data-active={on ? "yes" : "no"}
                                  data-ready={ready ? "yes" : "no"}
                                >
                                  <Icon className="size-3.5" />
                                </Button>
                              );
                            })
                          : null}

                        {/* ВСЕ КАНАЛЫ СРАЗУ — прежний вход по заголовку, переехавший на свою кнопку.
                            Иконка канала по-прежнему открывает ОДИН канал. */}
                        {isEvent && channels.length > 0 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            title={L.integrations}
                            aria-label={L.integrations}
                            onClick={() => setOpen({ row: e, only: null })}
                            className="size-6 shrink-0 opacity-60"
                            data-integration-all="yes"
                          >
                            <SlidersHorizontal className="size-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <EntityDrawer target={entity} onClose={() => setEntity(null)} lang={lang} />

      <IntegrationDrawer
        row={open?.row ?? null}
        only={open?.only ?? null}
        table={table}
        integrations={channels}
        lang={lang}
        onClose={() => setOpen(null)}
        onSaved={onRowChange}
      />
    </div>
  );
}
