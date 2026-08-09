// Общая рамка страницы панели (шаг 501). Серверный компонент.
//
// Одна рамка на все разделы: хлебные крошки, заголовок, поясняющая строка и
// место под содержимое. Пока раздел без логики — рамка честно говорит об этом
// полосой заготовки; когда логика переезжает, полоса убирается вместе с пропсом.
//
// КРОШКИ ЖИВУТ ЗДЕСЬ, а не в макете, по двум причинам. Первая техническая: макет
// в Next не получает ни адрес, ни параметры строки запроса — а путь обязан
// показывать открытый файл или журнал. Вторая важнее: рамка одна на все разделы,
// поэтому крошки не могут разойтись между страницами.

import type { ReactNode } from "react";
import { Breadcrumbs } from "./breadcrumbs";
import type { AdminPageSlug } from "@/lib/admin-nav";
import type { AdminStrings } from "@/lib/i18n/admin-strings";

export function PageShell(
  { title, hint, notice, children, lang, slug, s, params }:
  {
    title: string; hint: string; notice?: string; children?: ReactNode;
    /** Крошки рисуются, только когда переданы все три: язык, раздел и словарь. */
    lang?: string;
    slug?: AdminPageSlug;
    s?: AdminStrings;
    /** Параметры адреса — хвост пути (открытый файл, журнал, таблица). */
    params?: Record<string, string | undefined>;
  },
) {
  return (
    <>
      {/* Крошки ВНЕ колонки содержимого и без её полей: колонка центрируется, а
          путь обязан начинаться от левого верхнего края при любой ширине. */}
      {lang && slug && s && <Breadcrumbs lang={lang} slug={slug} s={s} params={params} />}

      {/* `data-app-column` вместо `max-w-3xl`: ширину задаёт переменная `--app-w`,
          которой управляет переключатель в подвале. Обычная ширина осталась той же
          (48rem = прежний max-w-3xl), но теперь её можно расширить на весь экран —
          разделам-таблицам колонка для чтения абзацем слишком узка. */}
      <div data-app-column className="px-4 py-6">
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{hint}</p>

        {notice && (
          <p className="mt-3 rounded-md border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground/80">
            {notice}
          </p>
        )}

        {children && <div className="mt-5">{children}</div>}
      </div>
    </>
  );
}
