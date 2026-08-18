// Типографика рабочих страниц (2026-08-18).
//
// 🔒 ЗАЧЕМ ОТДЕЛЬНАЯ ШКАЛА. Панель набрана 11–12 пикселями. Для таблицы настроек,
// которую пробегают глазами, это терпимо; для страницы, за которой РАБОТАЮТ
// минутами — читают вопросы, правят кейсы, разбирают шаги, — нет. Владелец
// назвал прежний экран нечитаемым, и это не вкусовщина: 11 пикселей текста
// абзацем не читаются никем.
//
// 🔒 ПОЧЕМУ ЗДЕСЬ, А НЕ ВО ВСЕЙ ПАНЕЛИ СРАЗУ. Переписать сорок экранов вслепую —
// ревизия, которую нельзя проверить по частям, и половина из них таблицы, где
// плотность оправдана. Поэтому шкала вводится там, где боль названа, но имена
// выбраны общие (`H1`/`H2`/`P`/`Small`/`Mono`) и внутри нет ни слова про
// продукты: когда владелец захочет её на всю панель, файл переедет, а вызовы
// останутся прежними.
//
// Размеры: H1 20 · H2 15 · H3 13 полужирный · текст 13 · подпись 11 · моно 12.
// Между 13 и 11 разница не декоративная: 13 — то, что читают, 11 — то, чем
// подписывают прочитанное.

import type { ReactNode } from "react";

export function H1({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h1 className={`text-[20px] font-semibold leading-tight text-foreground ${className}`}>{children}</h1>;
}

export function H2({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-[15px] font-semibold leading-snug text-foreground ${className}`}>{children}</h2>;
}

export function H3({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-[13px] font-semibold leading-snug text-foreground ${className}`}>{children}</h3>;
}

export function P({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[13px] leading-relaxed text-foreground ${className}`}>{children}</p>;
}

/** Пояснение под содержимым: тем же кеглем, но тише цветом. */
export function Muted({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[13px] leading-relaxed text-muted-foreground ${className}`}>{children}</p>;
}

/** Подпись: то, чем помечают прочитанное, — даты, счётчики, служебные пометки. */
export function Small({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`text-[11px] leading-normal text-muted-foreground ${className}`}>{children}</span>;
}

/** Машинная строка: путь, идентификатор, адрес. Моноширинный, не переводится. */
export function Mono({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`font-mono text-[12px] text-foreground ${className}`}>{children}</span>;
}

/**
 * Свёрнутая секция.
 *
 * 🔒 БЕЗ JAVASCRIPT: `<details>` открывается сам, работает с клавиатуры и
 * переживает выключенные скрипты — тот же приём, что у `HelpDetails`.
 *
 * 🔒 СЧЁТЧИК В ЗАГОЛОВКЕ ОБЯЗАТЕЛЕН. Закрытая секция обязана отвечать на вопрос
 * «есть ли там что-нибудь»: без счётчика человек открывает все восемь по очереди,
 * и смысл свёртывания исчезает.
 */
export function Section(
  { title, count, hint, children, open = false }: {
    title: string;
    /** Короткая сводка: «3 · подтверждён 1». Пусто — секция пуста, и это видно. */
    count?: string;
    hint?: string;
    children: ReactNode;
    open?: boolean;
  },
) {
  return (
    <details open={open} className="group mt-3 rounded-lg border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 hover:bg-muted/50">
        <span className="text-muted-foreground transition-transform group-open:rotate-90">›</span>
        <span className="text-[15px] font-semibold text-foreground">{title}</span>
        {count && <span className="text-[11px] text-muted-foreground">{count}</span>}
      </summary>
      <div className="border-t border-border px-4 py-3">
        {hint && <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}
        {children}
      </div>
    </details>
  );
}
