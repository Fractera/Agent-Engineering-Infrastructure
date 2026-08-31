import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { H3 } from "@/components/ui/typography";

// КАРТА ПУТИ (28-13, 2026-08-31; вид переписан 73, тот же день). Серверный элемент.
//
// 🔒 ЭТО ОТМЕНЯЕТ МОЁ РЕШЕНИЕ ИЗ 28-9, И ДОВОД ВЛАДЕЛЬЦА СИЛЬНЕЕ. Я построил вход
// БЕЗ списка шагов: «показанное действие читается как требуемое; список из
// шестнадцати пунктов есть шестнадцать требований разом». Владелец решил иначе:
// **карта — не набор требований, а ответ на вопрос «где я»**. Требование остаётся
// одно — открытый шаг. Прежний довод верен для ШАГА и неверен для КАРТЫ.
//
// ✗ ВИД ЭТОЙ КАРТОЧКИ БЫЛ ХАЛТУРОЙ, И ВЛАДЕЛЕЦ НАЗВАЛ ЭТО ПЕРВЫМ (2026-08-31):
// «мне кажется, если бы ты его делал по стандарту, у него был бы более крупный и
// более контрастный текст… шаги в круге цвета темы… бейджи, отмечающие статус,
// в одной линии с заголовком с противоположной стороны карточки… и стрелочка,
// символизирующая, что карточку нужно открыть».
//
// Здесь стояло: кружок 24px, сырые классы `text-[11px]` мимо шкалы, заголовок под
// `truncate`, статус серой строчкой под ним, никакой стрелки. Соседняя карточка
// пути (`path-card.tsx`) в том же проекте живёт по шкале: бейдж `Eyebrow`,
// заголовок `H2`, описание `Lead`. **Я вывел вид вместо того, чтобы посмотреть на
// соседа** — тот же ход, что оплачен шагом 70.
//
// 🔒 КРУГ ЦВЕТА ТЕМЫ, А НЕ «ЗЕЛЁНЫЙ». Слова владельца дословно: «зелёным только
// потому, что у нас тема зелёная». Значит `bg-primary` и `border-primary` — цвет
// приходит из палитры и меняется вместе с ней; литеральный зелёный отвязал бы
// карту от темы проекта на первой же смене фирменного цвета.
//
// 🔒 ОТМЕТКА ГОВОРИТ О ФАКТЕ, А НЕ О ПОСЕЩЕНИИ. Закрытый шаг — сохранённый адрес,
// ответ GitHub, поставленная отметка. Человек, открывший страницу и ушедший,
// ничего не закрыл: иначе повторился бы дефект шага 25, где мастер поздравлял с
// тем, чего человек не делал.
//
// 🔒 КАРТОЧКА — ССЫЛКА ЦЕЛИКОМ, А СТРЕЛКА ГОВОРИТ ОБ ЭТОМ ВСЛУХ. Попасть по ней
// должно быть так же легко, как промахнуться трудно; стрелка снимает вопрос
// «сюда вообще можно нажать».
export type StepMapItem = { n: number; slug: string; title: string; done: boolean };

export function StepMap({
  base,
  steps,
  labels,
}: {
  /** Адрес корня пути; к нему приписывается `slug` шага. */
  base: string;
  steps: StepMapItem[];
  labels: { stepWord: string; doneWord: string; todoWord: string };
}) {
  return (
    <ol className="mt-6 flex flex-col gap-3" data-step-map>
      {steps.map((s) => (
        <li key={s.n}>
          <Link
            href={`${base}/${s.slug}`}
            data-step-map-item={s.n}
            data-step-done={s.done ? "1" : "0"}
            className={
              "group flex items-center gap-4 rounded-xl border p-4 transition-colors " +
              (s.done
                ? "border-primary/30 bg-primary/5 hover:border-primary/50"
                : "border-border hover:border-foreground/30 hover:bg-muted/40")
            }
          >
            {/* Круг с номером шага — цвета темы. Закрытый залит и несёт галочку,
                открытый обведён: разница читается издалека, без чтения слов. */}
            <span
              aria-hidden
              className={
                "flex size-10 shrink-0 items-center justify-center rounded-full text-[length:var(--fs-body)] font-semibold " +
                (s.done
                  ? "bg-primary text-primary-foreground"
                  : "border-2 border-primary/40 text-foreground")
              }
            >
              {s.done ? <Check size={18} strokeWidth={3} /> : s.n}
            </span>

            {/* Заголовок и бейдж — в ОДНОЙ строке, по разным краям карточки. */}
            <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <H3 className="min-w-0 text-foreground">{s.title}</H3>
              <span
                data-step-badge={s.done ? "done" : "todo"}
                className={
                  "shrink-0 rounded-full px-3 py-1 text-[length:var(--fs-eyebrow)] font-medium " +
                  (s.done
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground")
                }
              >
                {s.done ? labels.doneWord : labels.todoWord}
              </span>
            </span>

            <ChevronRight
              aria-hidden
              className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
            />
          </Link>
        </li>
      ))}
    </ol>
  );
}

