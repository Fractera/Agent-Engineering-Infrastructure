"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDownIcon } from "../chrome/icons";
import { readOpen, writeOpen } from "./sections-state";

// АККОРДЕОН РАЗДЕЛА — один на всю автоматизацию: им обёрнута и вкладка (dashboard, control panel…), и
// КАЖДАЯ её сущность, когда сущностей больше одной. Дизайн взят из v1 (контейнер `rounded-lg border px-4`,
// строка с шевроном), реализация своя (закон 0).
//
// ЗАПОМИНАЕТ СВОЁ СОСТОЯНИЕ. Владелец раскладывает страницу под себя, и перезагрузка не должна это
// стирать: раскрыл/свернул — записали в память браузера этой автоматизации (`sections-state.ts`),
// вернулись — восстановили. Первая отрисовка идёт по умолчанию ЯДРА (чтобы серверная разметка совпала с
// клиентской), а сохранённый выбор поправляет её сразу после монтирования.
//
// Справа от заголовка — счётчик содержимого («2 items»), чтобы по свёрнутому разделу было видно, что
// внутри что-то есть и сколько.
export default function SectionAccordion({
  tab,
  cuid,
  title,
  count,
  countLabel,
  defaultOpen,
  children,
}: {
  /** Имя вкладки в ядре — первый уровень ключа памяти. */
  tab: string;
  /** cuid сущности, если это ВЛОЖЕННЫЙ аккордеон одной таблицы/пульта; для самой вкладки не задаётся.
   *  У вложенного счётчика не бывает: считать внутри одной сущности нечего. */
  cuid?: string;
  title: string;
  /** Сколько всего внутри (сущностей) — показывается справа у КАЖДОГО раздела, даже если запись одна. */
  count?: number;
  /** Шаблон подписи счётчика с «{n}» на языке страницы. */
  countLabel?: string;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const restored = useRef(false);

  useEffect(() => {
    const saved = readOpen(tab, cuid);
    if (saved !== undefined) setOpen(saved);
    restored.current = true;
  }, [tab, cuid]);

  function toggle(next: boolean) {
    setOpen(next);
    // пишем только по действию владельца: без этого первое же открытие страницы «застолбило» бы
    // умолчание ядра, и его будущая смена никогда бы не дошла до этого браузера
    if (restored.current) writeOpen(tab, next, cuid);
  }

  return (
    <details
      data-section={cuid ?? tab}
      open={open}
      onToggle={(e) => toggle((e.currentTarget as HTMLDetailsElement).open)}
      className="group border-b last:border-b-0"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 text-sm font-medium hover:underline [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 truncate capitalize">{title}</span>
        <span className="flex shrink-0 items-center gap-2">
          {/* счётчик — ТОЛЬКО у раздела (вкладки): по свёрнутому разделу должно быть видно, сколько
              записей внутри. Вложенному аккордеону он не положен. */}
          {!cuid && count && countLabel ? (
            <span className="text-xs font-normal text-muted-foreground">{countLabel.replace("{n}", String(count))}</span>
          ) : null}
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="pb-4 pt-0 text-sm text-muted-foreground">{children}</div>
    </details>
  );
}
