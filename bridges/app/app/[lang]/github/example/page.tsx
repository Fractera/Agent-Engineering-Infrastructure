// СТРАНИЦА-ОБРАЗЕЦ СТАНДАРТА СЕКЦИИ ПАНЕЛИ (шаг 28-1, 2026-08-27).
//
// 🔒 ЗАЧЕМ ОНА СУЩЕСТВУЕТ. Требование владельца дословно: «сейчас ты не сможешь
// протестировать мои настройки, так как у нас ни один шаг не соответствует моим
// требованиям и будет конфликтовать, поэтому сделай отдельную страницу на один
// уровень глубже, надпись `example`, и там покажи фейковые надписи, чтобы мы
// предварительно посмотрели этот шаг в действии».
//
// 🔒 ОНА НЕ ЧАСТЬ ПРОДУКТА И НЕ ЧИТАЕТ СОСТОЯНИЕ МАСТЕРА. Ни `readLaunch()`, ни
// дверей `api/config/launch/*`: числа и надписи фейковые, в `.env.local` не
// пишется ничего. Иначе образец начал бы двигать живой мастер владельца.
//
// 🔒 ЕЁ НЕТ В МЕНЮ ПАНЕЛИ. Раздел в меню — обещание способности; образец
// способностью не является, и названная, но не обеспеченная возможность есть
// приглашение импровизировать (первый закон `ANTI-PATTERNS.md`). Адрес известен
// владельцу и записан в плане шага.
//
// 🔒 `force-dynamic` ОБЯЗАТЕЛЕН ПОД ЭТИМ МАКЕТОМ. `app/[lang]/layout.tsx` считает
// живое состояние сервера (предупреждения, гейт кейсов); у статически
// предрендеренной страницы макет исполняется НА СБОРКЕ, и снимок той минуты потом
// висит в меню месяцами, честно показывая устаревшее.

import { Breadcrumbs } from "../../_components/breadcrumbs";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { ExampleHeader } from "./_components/example-header";
import { exampleStrings } from "./_demo-strings";
import { Small } from "@/components/ui/typography";

export const dynamic = "force-dynamic";

export default async function LaunchExamplePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = exampleStrings(lang);

  return (
    <>
      {/* Крошки — общий компонент панели, а не своя копия его разметки. Хвост
          пути показывает, что мы на уровень глубже вкладки запуска. */}
      <Breadcrumbs lang={lang} slug="github" s={s} params={{ file: x.crumb }} />

      <div data-app-column className="px-4 py-6">
        <ExampleHeader eyebrow={x.eyebrow} title={x.title} subtitle={x.subtitle} />

        {/* Честная строка о природе страницы. Она стоит ПОД шапкой, а не над
            ней: сначала человек видит то, ради чего пришёл, — стандарт
            заголовка, — и только потом оговорку о нём. */}
        <div className="mt-6 rounded-md border border-dashed border-border px-4 py-3">
          <Small className="text-foreground">{x.disclaimerTitle}</Small>
          <Small className="mt-1">{x.disclaimerBody}</Small>
        </div>
      </div>
    </>
  );
}
