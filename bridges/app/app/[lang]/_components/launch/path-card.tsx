import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { H2, Lead, Small } from "@/components/ui/typography";

// ОДИН БОЛЬШОЙ КОНТЕЙНЕР ВЫБОРА ПУТИ (шаг 28-2, 2026-08-27).
//
// 🔒 АНАТОМИЯ ОДНА, ПОТОМУ ЧТО ОНА В ОДНОМ ФАЙЛЕ. Владелец назвал два контейнера
// — «запуск проекта со стартового шаблона» и «подключение репозитория с проектом
// Fractera» — и потребовал, чтобы это был стандарт. Два контейнера, написанные по
// отдельности, разъезжаются: это не опасение, а замер, оплаченный на :3000, где
// шапку раздела собирали три вида и владелец трижды за день просил привести их «к
// одному стандарту». Пока форма живёт в двух местах, «одна анатомия» держится на
// памяти агента, а память — не механизм. Здесь она держится импортом.
//
// 🔒 ПОРЯДОК ФИКСИРОВАН, ПЕРЕСТАВИТЬ СНАРУЖИ НЕЛЬЗЯ:
//   бейдж → заголовок второго уровня → описание → список → «подробнее» → кнопка.
// Любую часть можно НЕ ДАТЬ — тогда её просто нет. Возможность переставить и есть
// то, из-за чего одинаковые с виду блоки расходятся.
//
// 🔒 ЭТО НЕ СЕРВЕРНЫЙ КОМПОНЕНТ, И СКАЗАНО ЭТО ЧЕСТНО. Директивы `"use client"`
// здесь нет, но единственный, кто его рисует, — островок выбора; значит файл
// уезжает в браузер вместе с ним. Слов словаря панели он не импортирует ни одного
// — всё приходит пропсами, поимённо. Ровно этого закон и требует: в браузере не
// должно оказаться 82 языков, а не «ни одной клиентской строки».

export function PathCard({
  badge,
  title,
  lead,
  bullets,
  moreLabel,
  more,
  tone,
  selected = false,
  children,
}: {
  /** Короткая метка над заголовком: чем этот путь является. */
  badge?: string;
  title: string;
  lead: string;
  /** Немаркированный список — что человек получит, выбрав этот путь. */
  bullets?: string[];
  /** Подпись раскрывашки. Без неё раскрывашки нет. */
  moreLabel?: string;
  more?: string;
  tone: "primary" | "amber";
  /** Выбранный путь обведён — человек видит, на чём остановился. */
  selected?: boolean;
  /** Единственное действие контейнера. Кнопку приносит островок. */
  children: ReactNode;
}) {
  const accent = tone === "primary" ? "text-primary" : "text-amber-600 dark:text-amber-400";

  return (
    <section
      data-path-card={tone}
      data-selected={selected ? "true" : "false"}
      className={[
        "flex flex-col rounded-xl border p-6 transition-colors",
        selected ? "border-foreground/40 bg-muted/40" : "border-border hover:border-foreground/20",
      ].join(" ")}
    >
      {badge && (
        <p className={`text-[length:var(--fs-eyebrow)] font-semibold uppercase tracking-widest ${accent}`}>
          {badge}
        </p>
      )}

      <H2 className="mt-3">{title}</H2>

      <Lead className="mt-3">{lead}</Lead>

      {bullets && bullets.length > 0 && (
        // Разметка списка настоящая (`<ul>`), а не абзацы с точкой: читалка
        // экрана называет число пунктов, и человек слышит, сколько их.
        <ul className="mt-5 flex flex-col gap-2">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2.5">
              <span aria-hidden className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${accent} bg-current`} />
              <Small className="text-foreground/80">{b}</Small>
            </li>
          ))}
        </ul>
      )}

      {/* Родной `<details>`: раскрывается без JS, находится поиском по странице и
          печатается вместе с ней. Состояния ради одного раскрытия не нужно. */}
      {moreLabel && more && (
        <details className="group mt-5">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[length:var(--fs-small)] text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronRight size={14} className="shrink-0 transition-transform group-open:rotate-90" />
            {moreLabel}
          </summary>
          <div className="mt-3 rounded-lg border border-border bg-muted/40 p-4">
            <Small>{more}</Small>
          </div>
        </details>
      )}

      {/* Кнопка прижата к низу: у двух контейнеров разной высоты действия обязаны
          стоять на одной линии, иначе взгляд ищет их дважды. */}
      <div className="mt-6 flex-1 content-end">{children}</div>
    </section>
  );
}
