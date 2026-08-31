import Link from "next/link";
import { Check } from "lucide-react";
import { Small } from "@/components/ui/typography";

// КАРТА ПУТИ (28-13, 2026-08-31). Серверный элемент.
//
// 🔒 ЭТО ОТМЕНЯЕТ МОЁ РЕШЕНИЕ ИЗ 28-9, И ДОВОД ВЛАДЕЛЬЦА СИЛЬНЕЕ. Я построил вход
// БЕЗ списка шагов, рассудив так: «показанное действие читается как требуемое;
// список из шестнадцати пунктов на входе есть шестнадцать требований разом».
// Владелец решил иначе: **карта — не набор требований, а ответ на вопрос «где
// я»**. Требование остаётся одно — открытый шаг; карта лишь показывает, сколько
// пройдено и сколько осталось. Прежний довод верен для ШАГА и неверен для КАРТЫ.
//
// 🔒 ОТМЕТКА СЛЕВА ГОВОРИТ О ФАКТЕ, А НЕ О ПОСЕЩЕНИИ. Зелёный кружок значит
// «шаг закрыт»: сохранён адрес, ответил GitHub, поставлена отметка. Человек,
// открывший страницу и ушедший, ничего не закрыл — иначе повторился бы дефект
// шага 25, где мастер поздравлял с тем, чего человек не делал.
//
// 🔒 КАРТОЧКА — ССЫЛКА ЦЕЛИКОМ, А НЕ ССЫЛКА ВНУТРИ КАРТОЧКИ: попасть по ней
// должно быть так же легко, как промахнуться мимо неё — трудно.
export type StepMapItem = { n: number; slug: string; title: string; done: boolean };

export function StepMap({
  base,
  steps,
  labels,
}: {
  /** Адрес корня пути; к нему приписывается `slug` шага. */
  base: string;
  steps: StepMapItem[];
  labels: { stepWord: string; doneWord: string };
}) {
  return (
    <ol className="mt-6 flex flex-col gap-2" data-step-map>
      {steps.map(s => (
        <li key={s.n}>
          <Link
            href={`${base}/${s.slug}`}
            data-step-map-item={s.n}
            data-step-done={s.done ? "1" : "0"}
            className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-foreground/30"
          >
            <span
              aria-hidden
              className={
                "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] " +
                (s.done
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground")
              }
            >
              {s.done ? <Check size={13} /> : s.n}
            </span>
            <span className="min-w-0">
              <Small className="block truncate text-foreground">{s.title}</Small>
              <span className="text-[11px] text-muted-foreground">
                {labels.stepWord} {s.n}
                {s.done ? ` · ${labels.doneWord}` : ""}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
