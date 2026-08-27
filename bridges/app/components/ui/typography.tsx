import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

// ТИПОГРАФИКА ПАНЕЛИ — ОДНА ШКАЛА НА ВЕСЬ ПОРТ 3002 (шаг 28-1, 2026-08-27).
//
// 🔒 ЗАЧЕМ ЭТОТ ФАЙЛ ПОЯВИЛСЯ. В `components/ui/` панели было восемь
// компонентов — кнопка, поле, галочка, диалог — и НИ ОДНОГО для текста. Поэтому
// каждая страница описывала заголовок сама, руками, кеглями 10–13 пикселей:
// заголовок раздела `text-base font-semibold` (16px) против 30/36/48 на сайте
// :3000. Владелец назвал это «отвратительный дизайн», и он прав — но причина не
// в небрежности, а в отсутствующем примитиве: там, где нет одного места,
// расхождение неизбежно и лишь ждёт числа правок.
//
// 🔒 ЭТО ПЕРЕНОС, А НЕ НОВОЕ РЕШЕНИЕ. Требование владельца дословно:
// «переиспользуем стандарт [проекта :3000] для заголовка первого уровня на всех
// страницах Port 3002». Источник — `fractera-next-starter/components/ui/
// typography.tsx` и шкала `--fs-*` в его `styles/globals.css`. Числа и законы
// взяты оттуда; выдумывать здесь свои значило бы завести ВТОРОЙ стандарт под
// видом переиспользования первого.
//
// 🔒 ГДЕ ОН ПОКА ПРИМЕНЁН. Только на странице-образце `/[lang]/github/example`.
// Решение владельца 2026-08-27: `app/[lang]/_components/page-shell.tsx` рисует
// заголовок ВСЕХ 26 разделов, и правка в нём поменяла бы панель целиком раньше,
// чем образец утверждён. Перевод остальных страниц — отдельный подшаг.
//
// 🔒 ШКАЛА ТОЛЬКО РАСТЁТ С ЭКРАНОМ. На :3000 восемь заголовков уменьшались
// (`text-4xl md:text-3xl` — на телефоне крупнее, чем на мониторе). Здесь такой
// записи появиться не может: размеры заданы один раз и перечислены по
// возрастанию.
//
// 🔒 РАЗМЕРЫ — ПЕРЕМЕННЫЕ, А НЕ ЧИСЛА. Ступени живут в `app/globals.css`
// (`--fs-*`) и посчитаны от множителя `--type-scale`. Написать здесь `text-3xl`
// значило бы поставить размер ВНЕ шкалы: множитель поедет, а число останется —
// шкала, которой подчиняется не всё, не шкала.

// Заголовки — с засечками, как на витрине: заголовок есть опознавательный знак
// продукта, и он обязан быть один. Остальной текст — рубленый.
const HEADING_FAMILY = "font-serif"
const BODY_FAMILY = "font-sans"

// 🔒 У ЗАГОЛОВКА СТРАНИЦЫ ВАРИАНТОВ НЕТ — ОДИН НА ВСЮ ПАНЕЛЬ.
//
// На :3000 их было два — «витринный» и «рабочий», — и замер на живом сервере
// показал цену: две страницы одного защищённого слоя отличались ВДВОЕ по
// размеру и шрифтом, человек между ними видел два разных продукта. Довод
// «рабочий экран не должен выглядеть афишей» звучит разумно и неверен: страница
// делается плотной отступами и содержимым, а не мелким заголовком.
const H1_STYLE = `${HEADING_FAMILY} text-[length:var(--fs-h1)] font-bold leading-tight tracking-tight md:text-[length:var(--fs-h1-md)] lg:text-[length:var(--fs-h1-lg)]`

const H2_STYLE = `${HEADING_FAMILY} text-[length:var(--fs-h2)] font-bold leading-snug tracking-tight md:text-[length:var(--fs-h2-md)]`

const H3_STYLE = `${BODY_FAMILY} text-[length:var(--fs-h3)] font-semibold leading-snug md:text-[length:var(--fs-h3-md)]`

/** Заголовок страницы. Один на весь порт 3002. */
export function H1({ className, ...props }: ComponentProps<"h1">) {
  return <h1 className={cn(H1_STYLE, "text-foreground", className)} {...props} />
}

/** Заголовок раздела внутри страницы — шага мастера, крупного блока. */
export function H2({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn(H2_STYLE, "text-foreground", className)} {...props} />
}

/** Заголовок внутри раздела. */
export function H3({ className, ...props }: ComponentProps<"h3">) {
  return <h3 className={cn(H3_STYLE, "text-foreground", className)} {...props} />
}

/** Обычный текст страницы. */
export function P({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-[length:var(--fs-body)] leading-[var(--type-leading)] text-muted-foreground md:text-[length:var(--fs-body-md)]",
        className,
      )}
      {...props}
    />
  )
}

/** Вводный абзац под заголовком — крупнее обычного, но не заголовок. */
export function Lead({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-[length:var(--fs-lead)] leading-[var(--type-leading)] text-muted-foreground md:text-[length:var(--fs-lead-md)]",
        className,
      )}
      {...props}
    />
  )
}

/** Подпись, сноска, вспомогательная строка. */
export function Small({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-[length:var(--fs-small)] leading-normal text-muted-foreground", className)} {...props} />
}

/**
 * Надзаголовок: короткая метка над заголовком.
 *
 * 🔒 ЕДИНСТВЕННОЕ МЕСТО, ГДЕ В ТИПОГРАФИКЕ ЖИВЁТ `uppercase` И РАЗРЯДКА. Их
 * роль — отличить служебную метку от текста; писать их ещё где-то значит стирать
 * эту разницу.
 */
export function Eyebrow({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-[length:var(--fs-eyebrow)] font-semibold uppercase tracking-widest text-primary",
        className,
      )}
      {...props}
    />
  )
}
