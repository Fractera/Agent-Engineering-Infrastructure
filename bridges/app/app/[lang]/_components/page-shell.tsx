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
import { H1, Lead } from "@/components/ui/typography";
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
        {/* 🔒 ЗАГОЛОВОК И ОПИСАНИЕ — ПРИМИТИВЫ, А НЕ КЕГЛИ НА МЕСТЕ (шаг 28-7,
            2026-08-27). Здесь стояло `text-base font-semibold` (16px) и
            подсказка `text-[12px]`. Владелец, увидев образец на
            `/[lang]/github/example`, отменил своё утреннее решение «только
            образец» и распространил стандарт на все разделы:
            «to do all pages in admin to this h1 + description standart».

            Правка ОДНА на 26 разделов ровно потому, что эта рамка существует.
            Не будь её, та же задача была бы двадцатью шестью правками и
            разъехалась бы на третьей — так это и случилось однажды на :3000,
            где шапку собирала каждая страница сама.

            🔒 `Eyebrow` СЮДА НЕ ДОБАВЛЯЕТСЯ: у разделов есть крошки, и
            надзаголовок назвал бы имя раздела третий раз подряд. Образец несёт
            его потому, что стоит вне меню и обязан объяснить, что он такое. */}
        <div className="flex flex-col gap-4">
          <H1>{title}</H1>
          <Lead className="max-w-3xl">{hint}</Lead>
        </div>

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
