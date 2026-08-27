// РАЗДЕЛ «ЗАПУСК ПРОЕКТА» — ЭКРАН ВЫБОРА ПУТИ (шаг 28-8, 2026-08-27).
//
// 🔒 ЭТО НОВАЯ СТРАНИЦА, А НЕ ПРАВКА СТАРОЙ. Владелец назвал адрес сам:
// `https://admin.aifa.dev/ru/project-start`. Живая вкладка `/[lang]/github`
// остаётся на месте нетронутой — её переделка была бы рефакторингом, который
// владелец запретил 2026-08-27 («не начинать рефакторинг»). Две страницы живут
// рядом, пока он не скажет, какая остаётся.
//
// 🔒 ЗАГОЛОВОК РИСУЕТ ОБЩАЯ РАМКА. С подшага 28-7 `PageShell` отдаёт H1 по шкале
// `--fs-h1` и описание примитивом `Lead` — то есть ровно ту шапку, которую
// владелец утвердил на образце. Своей шапки у страницы поэтому нет: вторая копия
// шапки — это и есть механизм, которым разъезжаются страницы.
//
// 🔒 ШИРОКАЯ КОЛОНКА — РАДИ ДВУХ КОЛОНОК КАРТОЧЕК. Владелец: «use 2 column
// design for cards». В обычных 48rem пара колонок даёт по 21rem и ломает
// заголовок карточки на три строки — замерено. Признак `wide` раздвигает ТОЛЬКО
// содержимое; шапка остаётся на общей ширине, чтобы начало текста не прыгало при
// переходе между разделами.
//
// 🔒 СТРАНИЦА НИЧЕГО НЕ ЗАПИСЫВАЕТ. Островок выбора держит решение в памяти
// вкладки: дверь `api/config/launch/start-mode` подключается тогда, когда
// владелец подтвердит сам экран. Записать раньше — значит менять режим старта у
// человека, который пришёл посмотреть.
//
// 🔒 `force-dynamic` ОБЯЗАТЕЛЕН ПОД ЭТИМ МАКЕТОМ: `app/[lang]/layout.tsx` считает
// живое состояние сервера, и у статически предрендеренной страницы он исполнится
// на сборке — снимок той минуты потом висит месяцами.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../_components/page-shell";
import { PathChoice } from "../_components/launch/path-choice.client";
import { pathChoiceStrings } from "./_strings";

export const dynamic = "force-dynamic";

export default async function ProjectStartPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const p = pathChoiceStrings(lang);

  return (
    <PageShell
      lang={lang}
      slug="project-start"
      s={s}
      wide
      title={s.pages["project-start"].title}
      hint={s.pages["project-start"].hint}
    >
      {/* 🔒 ОСТРОВКУ — ТОЛЬКО ЕГО СЛОВА, ПЕРЕЧИСЛЕННЫЕ ПОИМЁННО. `labels={p}`
          скомпилировалось бы и уехало по проводу целиком со всем, что окажется в
          объекте завтра: тип не сужает рантайм. ✗ оплачено дважды за шаг 25. */}
      <PathChoice
        // 🔒 ЗДЕСЬ КНОПКИ ВЕДУТ, А НА ОБРАЗЦЕ ТОЛЬКО ОТМЕЧАЮТ. На реальном
        // разделе выбор пути обязан открывать страницы этого пути — это и есть
        // выбор; на образце вести некуда, он показывает вид, а не работу.
        hrefs={{
          starter: `${adminHref(lang, "project-start")}/default-template`,
          adopt: `${adminHref(lang, "project-start")}/custom-fractera-repo`,
        }}
        labels={{
          starterBadge: p.starterBadge,
          starterTitle: p.starterTitle,
          starterLead: p.starterLead,
          starterBullets: p.starterBullets,
          starterMoreLabel: p.starterMoreLabel,
          starterMore: p.starterMore,
          starterCta: p.starterCta,
          adoptBadge: p.adoptBadge,
          adoptTitle: p.adoptTitle,
          adoptLead: p.adoptLead,
          adoptBullets: p.adoptBullets,
          adoptMoreLabel: p.adoptMoreLabel,
          adoptMore: p.adoptMore,
          adoptCta: p.adoptCta,
          picked: p.picked,
          reset: p.reset,
        }}
      />
    </PageShell>
  );
}
