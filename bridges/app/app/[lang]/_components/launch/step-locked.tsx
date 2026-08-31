import Link from "next/link";
import { Small } from "@/components/ui/typography";

// ЗАГЛУШКА ШАГА, ДО КОТОРОГО ЧЕЛОВЕК ЕЩЁ НЕ ДОШЁЛ (28-13, 2026-08-31).
//
// Владелец: «если пользователь прыгнет [на] тот шаг, который ещё неактивен, то
// на этой странице нужно показать заголовок со названием, [вместо] контента шага
// показать skeleton с текстом анимированным „до этого шага вы ещё не добрались,
// вернитесь на шаг …“».
//
// 🔒 ЗАГОЛОВОК ОСТАЁТСЯ, СОДЕРЖИМОЕ — НЕТ. Человек пришёл сюда по ссылке и
// вправе узнать, куда попал: страница без заголовка читается как поломка, а не
// как «рано». Скрывается ровно то, ради чего шаг существует, — его действие.
//
// 🔒 СТРАНИЦА НАЗЫВАЕТ, КУДА ВЕРНУТЬСЯ, И ЭТО ССЫЛКА, А НЕ ТЕКСТ. Сказать «вы не
// добрались» и оставить человека искать дорогу самому значит сделать отказ
// вежливым и бесполезным.
//
// 🔒 ДВИЖЕНИЕ — ТОЛЬКО У ЗАГЛУШКИ, И ОНО НИЧЕГО НЕ ОБЕЩАЕТ. Пульсирующие полосы
// говорят «здесь будет содержимое», а не «идёт загрузка»: загрузки тут нет, ждать
// нечего.
export function StepLocked({
  title,
  message,
  backHref,
  backLabel,
}: {
  title: string;
  /** Готовая фраза с номером шага, к которому надо вернуться. */
  message: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="flex flex-col gap-5" data-step-locked>
      <p className="text-[length:var(--fs-h2)] font-semibold text-foreground">{title}</p>

      <div className="rounded-lg border border-border p-4">
        <div className="flex flex-col gap-2" aria-hidden>
          <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        </div>
        <Small className="mt-4 block text-muted-foreground">{message}</Small>
        <Link
          href={backHref}
          data-step-locked-back
          className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
