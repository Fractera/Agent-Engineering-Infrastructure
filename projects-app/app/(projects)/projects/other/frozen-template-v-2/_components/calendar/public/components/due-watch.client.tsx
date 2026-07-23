"use client";

import { useEffect, useRef, useState } from "react";
import { isDueInWindow, notifyAtMs, type CalRow } from "../../../../_lib/components/calendar";
import { secondsLeft, type CronSettings } from "../../../cron/schedule";
import { Toast, ToastStack } from "../../../shared/toast.client";
import type { EntryType } from "../../entries";
import { calendarStrings } from "../../i18n";
import { pick } from "../../../shared/localized";

// СТОРОЖ КАЛЕНДАРЯ — единственное место, где живёт закон уведомлений (владелец, шаг 292):
//
//   1. Проверяет календарь РАЗ В ПЕРИОД КРОНА. Нет раздела «Крон» или он выключен — сторож не работает
//      вовсе и не рисует ничего: «если крон существует» — дословное условие владельца.
//   2. Тик ВЫРОВНЕН по стенным часам (`secondsLeft`), а не отсчитывается от загрузки страницы: витрина и
//      кокпит, открытые в разное время, обязаны проверять календарь в один и тот же момент.
//   3. Нашёл наступившую запись — поднял тост, который НЕЛЬЗЯ закрыть автоматически: только кнопкой
//      «Окей, я понимаю». Наступивших может быть несколько сразу — тогда несколько тостов стопкой,
//      каждый со своим подтверждением.
//   4. На СЛЕДУЮЩЕМ тике все тосты прошлого тика, которых владелец не подтвердил, ГАСЯТСЯ сами. Не
//      успел за период — крон приберёт: экран не превращается в свалку неподтверждённого.
//   5. Подтверждённое помнит браузер, поэтому перезагрузка страницы не поднимает тот же тост заново.
//
// ЧЕГО СТОРОЖ НЕ ДЕЛАЕТ (осознанно). Он не воскрешает пропущенное: наступившим считается то, чей момент
// пришёлся на ПОСЛЕДНИЙ период (`isDueInWindow`). Иначе страница, открытая наутро, вывалила бы стопку
// тостов обо всём, что случилось за ночь. Уведомление живёт в браузере — значит закрытый браузер
// уведомления не получает, и делать вид, что это не так, было бы обманом.
//
// Работает НА ОБЕИХ ПОВЕРХНОСТЯХ: сторож монтируется внутри календаря, а календарь есть и в кокпите, и
// на витрине.

/** Что подтверждено — в браузере, отдельно для каждой автоматизации (идиома `shared/sections-state.ts`). */
function ackKey(): string {
  const path = typeof location === "undefined" ? "" : location.pathname.replace(/\/+$/, "");
  return `fractera:calendar-ack:${path}`;
}

function readAck(): Record<string, number> {
  try {
    const raw = localStorage.getItem(ackKey());
    const v = raw ? (JSON.parse(raw) as Record<string, number>) : null;
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

function writeAck(map: Record<string, number>): void {
  try {
    // Помним только свежее: подтверждения старше суток бесполезны и растили бы запись без предела.
    const edge = Date.now() - 24 * 60 * 60 * 1000;
    const kept = Object.fromEntries(Object.entries(map).filter(([, at]) => at > edge));
    localStorage.setItem(ackKey(), JSON.stringify(kept));
  } catch {
    /* приватный режим браузера — подтверждение просто не запомнится, ломать из-за этого нечего */
  }
}

/** Ключ уведомления = запись + её момент: сдвинули время записи — это новое уведомление. */
const noticeKey = (row: CalRow): string => `${row.id}@${notifyAtMs(row) ?? 0}`;

type Notice = { key: string; row: CalRow; raisedAt: number };

export default function DueWatch({
  rows,
  cron,
  types,
  lang,
}: {
  rows: CalRow[];
  cron: CronSettings | null;
  types: EntryType[];
  lang: string;
}) {
  const L = calendarStrings(lang);
  const [notices, setNotices] = useState<Notice[]>([]);
  // Свежие записи нужны тику, но их появление не должно перезаводить сам таймер — иначе такт съезжал бы
  // при каждой перезагрузке строк.
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const enabled = Boolean(cron?.enabled);
  const everyMinutes = cron?.everyMinutes ?? 0;

  useEffect(() => {
    if (!enabled) {
      setNotices([]);
      return;
    }
    const periodMs = Math.max(1, everyMinutes) * 60_000;

    function check() {
      const now = Date.now();
      const ack = readAck();
      const due = rowsRef.current.filter((r) => isDueInWindow(r, now, periodMs) && !ack[noticeKey(r)]);
      // Прошлый тик прибирается ЗДЕСЬ ЖЕ: старое уходит, наступившее сейчас встаёт на его место — одна
      // запись состояния, а не две подряд.
      setNotices(due.map((row) => ({ key: noticeKey(row), row, raisedAt: now })));
    }

    check();
    // Первый тик — в конце ТЕКУЩЕГО периода стенных часов, дальше ровно раз в период.
    let interval: ReturnType<typeof setInterval> | undefined;
    const align = setTimeout(() => {
      check();
      interval = setInterval(check, periodMs);
    }, secondsLeft(everyMinutes) * 1000);

    return () => {
      clearTimeout(align);
      if (interval) clearInterval(interval);
    };
  }, [enabled, everyMinutes]);

  if (!enabled || notices.length === 0) return null;

  const labelOf = (row: CalRow): string => {
    const t = types.find((x) => x.key === row.type);
    return pick(t?.label, lang) || (row.type === "reminder" ? L.typeReminder : L.typeEvent);
  };

  function acknowledge(key: string) {
    const ack = readAck();
    ack[key] = Date.now();
    writeAck(ack);
    setNotices((list) => list.filter((n) => n.key !== key));
  }

  return (
    <ToastStack>
      {notices.map((n) => (
        <Toast
          key={n.key}
          tone="notice"
          actionLabel={L.acknowledge}
          text={`${n.row.time} · ${labelOf(n.row)}\n${n.row.title}`}
          onClose={() => acknowledge(n.key)}
        />
      ))}
    </ToastStack>
  );
}
