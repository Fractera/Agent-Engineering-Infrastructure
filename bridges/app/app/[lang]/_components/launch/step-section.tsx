import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { H2, Lead, Small } from "@/components/ui/typography";
import { Callout } from "./callout";
import { StepLink } from "./step-link";

// АНАТОМИЯ ОДНОГО ШАГА МАСТЕРА (шаг 28-3, 2026-08-27).
//
// 🔒 ПОРЯДОК СУЩНОСТЕЙ НАЗВАН ВЛАДЕЛЬЦЕМ И ЗАФИКСИРОВАН ЗДЕСЬ. Сверху вниз:
//
//   1 отметка «завершён», если завершён   6 голубая подсказка — информация
//   2 «шаг X из Y» + ШКАЛА в той же строке 7 оранжевая подсказка — это важно
//   3 область бейджа                      8 описание для действия
//   4 заголовок второго уровня            9 немаркированный список
//   5 описание заголовка                 10 ССЫЛКА-ДЕЙСТВИЕ, над областью ввода
//                                          затем — действие (поле, галочка, кнопка)
//
// Десятая сущность и шкала добавлены 28-11 по решению владельца; обе описаны
// подробно там, где нарисованы.
//
// Переставить снаружи нельзя ничего: возможность переставить и есть то, из-за
// чего одинаковые с виду блоки расходятся. Любую сущность можно НЕ ДАТЬ — тогда
// её просто нет.
//
// 🔒 НЕ ДАННАЯ СУЩНОСТЬ НЕ РИСУЕТ ПУСТОЙ КОНТЕЙНЕР. Шаг без оранжевой подсказки
// не оставляет оранжевой рамки с пустотой внутри: пустая рамка читается как
// поломка, а не как «здесь нечего сказать».
//
// 🔒 ОДНО ДЕЙСТВИЕ — ОДИН ШАГ (закон владельца 2026-08-27: «one step for one
// step»). Эта секция рисует РОВНО ОДИН шаг и ровно одно действие в нём. Живой
// мастер сегодня объявляет «шаг 1 из 13» и требует внутри четырёх действий
// подряд — адрес, токен, проверку, отправку; владелец назвал это дефектом
// словами «it must to be 4 steps , not 1». Здесь такой шаг построить нечем: у
// секции одно место под действие, и второе положить некуда.

const fill = (t: string, v: Record<string, string | number>) =>
  t.replace(/\{(\w+)\}/g, (m, k) => String(v[k] ?? m));

export function StepSection({
  index,
  total,
  stepOfTemplate,
  doneLabel,
  done = false,
  badge,
  title,
  lead,
  info,
  important,
  actionLead,
  bullets,
  link,
  children,
}: {
  /** Номер шага, считая с единицы: человеку показывается он, а не индекс. */
  index: number;
  total: number;
  /** Шаблон «Шаг {n} из {total}» — слово приходит снаружи, склейка здесь. */
  stepOfTemplate: string;
  doneLabel: string;
  done?: boolean;
  badge?: string;
  title: string;
  lead?: string;
  /** Голубая подсказка: то, что полезно знать. */
  info?: ReactNode;
  /** Оранжевая подсказка: то, чем можно навредить себе. */
  important?: ReactNode;
  /** Описание для действия — что человек сейчас сделает. */
  actionLead?: string;
  bullets?: string[];
  /**
   * Ссылка-действие: КУДА идти делать то, ради чего шаг существует.
   *
   * 🔒 ОНА СТОИТ НАД ОБЛАСТЬЮ ВВОДА — решение владельца 2026-08-27: «располагать
   * её надо над областью ввода, так как она по сути является главной частью
   * информационной составляющей». Под полем её читают уже после того, как искали
   * значение, которого ещё нет.
   *
   * 🔒 ЭТО НЕ ВТОРОЕ ДЕЙСТВИЕ ШАГА. Ссылка ведёт наружу, к чужому сервису;
   * действие шага — то, что человек делает ЗДЕСЬ, вернувшись оттуда. Я спутал
   * эти две вещи, строя шаг 2, и не перенёс ссылку из живого мастера.
   */
  link?: { href: string; label?: string };
  /** Само действие: поле, галочка, кнопка. Приносит островок. */
  children?: ReactNode;
}) {
  return (
    <section
      data-step-section={index}
      data-done={done ? "true" : "false"}
      className={[
        "rounded-xl border p-6 transition-colors",
        done ? "border-emerald-500/40 bg-emerald-500/[0.04]" : "border-border",
      ].join(" ")}
    >
      {/* 1 + 2: счётчик слева, ШКАЛА ПРОГРЕССА в той же строке, отметка
          завершённости справа. Все трое отвечают на один вопрос — «где я и
          пройдено ли это», поэтому стоят вместе.

          🔒 ШКАЛА В ОДНОЙ СТРОКЕ СО СЧЁТЧИКОМ — требование владельца
          2026-08-27: «предполагается, что в одной линии с этим текстом будет
          находиться 16 пунктирных линий, которые займут всё оставшееся
          пространство без переноса на следующую строку, будут сжиматься и
          окрашиваться в зелёный цвет — те шаги, которые пройдены».

          🔒 КАК ЭТО НЕ ПЕРЕНОСИТСЯ. `flex-1` на каждом отрезке и `min-w-0` на
          дорожке: отрезки делят остаток строки поровну и сжимаются, сколько бы
          их ни было. Фиксированная ширина отрезка при шестнадцати шагах на
          узком экране дала бы вторую строку — ровно то, что запрещено. */}
      <div className="flex items-center gap-4">
        <Small className="shrink-0 font-mono uppercase tracking-wider text-muted-foreground">
          {fill(stepOfTemplate, { n: index, total })}
        </Small>

        <div className="flex min-w-0 flex-1 items-center gap-1" aria-hidden data-step-scale={total}>
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              data-scale-tick={i < index - 1 ? "done" : i === index - 1 ? "current" : "future"}
              className={[
                "h-0.5 min-w-0 flex-1 rounded-full",
                i < index - 1
                  ? "bg-emerald-500"
                  : i === index - 1
                    ? "bg-foreground"
                    : "bg-border",
              ].join(" ")}
            />
          ))}
        </div>

        {done && (
          <span
            data-step-done
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[length:var(--fs-eyebrow)] font-semibold text-emerald-700 dark:text-emerald-300"
          >
            <Check size={13} aria-hidden className="shrink-0" />
            {doneLabel}
          </span>
        )}
      </div>

      {/* 3: область бейджа. */}
      {badge && (
        <p className="mt-4 text-[length:var(--fs-eyebrow)] font-semibold uppercase tracking-widest text-primary">
          {badge}
        </p>
      )}

      {/* 4 + 5: заголовок второго уровня и его описание. */}
      <H2 className="mt-3">{title}</H2>
      {lead && <Lead className="mt-3">{lead}</Lead>}

      {/* 6 + 7: две подсказки. Голубая раньше оранжевой: сначала человек узнаёт,
          как устроено, и только потом — чем может себе навредить. */}
      {(info || important) && (
        <div className="mt-6 flex flex-col gap-3">
          {info && <Callout tone="info">{info}</Callout>}
          {important && <Callout tone="important">{important}</Callout>}
        </div>
      )}

      {/* 8: описание для действия — отдельная сущность, а не часть описания
          заголовка. Заголовок объясняет, ЧТО это за шаг; эта строка говорит, что
          человек сделает руками прямо сейчас. */}
      {actionLead && (
        <Small className="mt-6 block text-foreground">{actionLead}</Small>
      )}

      {/* 9: немаркированный список. Разметка настоящая: читалка экрана называет
          число пунктов, и человек слышит, сколько их. */}
      {bullets && bullets.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2.5">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <Small>{b}</Small>
            </li>
          ))}
        </ul>
      )}

      {/* 10: ССЫЛКА-ДЕЙСТВИЕ — над областью ввода и внутри той же отделённой
          части, что и действие: вместе они отвечают на «что делать», тогда как
          всё выше отвечает на «что это за шаг». */}
      {(link || children) && (
        <div className="mt-7 border-t border-border pt-6">
          {link && (
            <div className="mb-5">
              <StepLink href={link.href} label={link.label} />
            </div>
          )}
          {children}
        </div>
      )}
    </section>
  );
}
