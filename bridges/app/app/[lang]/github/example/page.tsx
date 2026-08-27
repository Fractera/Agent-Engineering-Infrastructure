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
import { PathChoice } from "../../_components/launch/path-choice.client";
import { ExampleFlow } from "./_components/example-flow.client";
import { exampleSteps, exampleFlowLabels } from "./_demo-steps";
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

        {/* 🔒 ОСТРОВКУ — ТОЛЬКО ЕГО СЛОВА, ПЕРЕЧИСЛЕННЫЕ ПОИМЁННО (28-2).
            `labels={x.path}` скомпилировалось бы и уехало по проводу целиком со
            всем, что в объекте окажется завтра. Тип не сужает рантайм — это
            оплачено дважды за шаг 25. Перечисление ниже длиннее на десять строк
            и ровно этим и ценно: добавить поле молча нельзя. */}
        <div className="mt-10">
          <PathChoice
            labels={{
              starterBadge: x.path.starterBadge,
              starterTitle: x.path.starterTitle,
              starterLead: x.path.starterLead,
              starterBullets: x.path.starterBullets,
              starterMoreLabel: x.path.starterMoreLabel,
              starterMore: x.path.starterMore,
              starterCta: x.path.starterCta,
              adoptBadge: x.path.adoptBadge,
              adoptTitle: x.path.adoptTitle,
              adoptLead: x.path.adoptLead,
              adoptBullets: x.path.adoptBullets,
              adoptMoreLabel: x.path.adoptMoreLabel,
              adoptMore: x.path.adoptMore,
              adoptCta: x.path.adoptCta,
              picked: x.path.picked,
              reset: x.path.reset,
            }}
          />
        </div>

        {/* Скелет шагов. Слова — заполнители: их пишет владелец, не агент. */}
        <div className="mt-12">
          <ExampleFlow steps={exampleSteps(lang)} labels={exampleFlowLabels(lang)} />
        </div>
      </div>
    </>
  );
}
