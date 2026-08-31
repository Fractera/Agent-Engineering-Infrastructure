// ПОДСТРАНИЦА ПУТИ «СВОЙ РЕПОЗИТОРИЙ FRACTERA» (28-9, 2026-08-27; путь начат 35-1, 2026-08-31).
//
// 🪦 ЗДЕСЬ СТОЯЛА ЧЕСТНАЯ ЗАГЛУШКА, И ОНА СВОЁ ОТСЛУЖИЛА. Текст был: «шаги этого
// пути ещё не построены» плюс обещание, что тут будет проверка донора и клон в
// соседнюю папку. Заглушка была правильной ровно до того дня, когда шаги
// появились: названная, но не обеспеченная возможность — приглашение
// импровизировать, а пустая страница с честной строкой лучше живой на вид кнопки,
// которая никуда не ведёт.
//
// 🔒 ВХОД ПОКАЗЫВАЕТ ОДНУ КНОПКУ, А НЕ СПИСОК ИЗ ЧЕТЫРНАДЦАТИ ПУНКТОВ. У первого
// пути карта появилась решением владельца (28-13) и отвечает на вопрос «где я»,
// показывая ПРОЙДЕННОЕ. Здесь пройденного пока нет: построен один шаг, и карта из
// одной строки была бы не картой, а кнопкой с лишней рамкой. Карта придёт вместе
// с шагами (35-6), а не раньше них.

import Link from "next/link";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../../_components/page-shell";
import { Lead } from "@/components/ui/typography";
import { adoptPathStrings, adoptStepOneStrings } from "./_strings";

export const dynamic = "force-dynamic";

export default async function CustomFracteraRepoIndex(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = adoptStepOneStrings(lang);
  const p = adoptPathStrings(lang);

  return (
    <PageShell
      lang={lang}
      slug="project-start"
      s={s}
      params={{ file: "custom-fractera-repo" }}
      title={x.pageTitle}
      hint={x.pageHint}
    >
      <Lead>{p.lead}</Lead>

      <Link
        href={`${adminHref(lang, "project-start")}/custom-fractera-repo/step-1`}
        data-adopt-start
        className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-[length:var(--fs-small)] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {p.startLabel}
      </Link>
    </PageShell>
  );
}
