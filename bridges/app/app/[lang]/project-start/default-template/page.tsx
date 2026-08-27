// ПОДСТРАНИЦА ПУТИ «СТАРТОВЫЙ ШАБЛОН» (шаг 28-9, 2026-08-27).
//
// 🔒 ЗАЧЕМ ОНА НУЖНА, ЕСЛИ ШАГИ — ОТДЕЛЬНЫЕ СТРАНИЦЫ. Владелец: «наша разделка
// пойдёт и создаст две подстраницы… дальше внутри каждого из них будут страницы
// Steps от начала и до конца». Эта страница и есть вход в путь: у пути должен
// быть адрес, на который можно вернуться, не помня номера шага.
//
// 🔒 ОНА НЕ ПОКАЗЫВАЕТ СПИСОК ШАГОВ. Показанное действие читается как
// требуемое — закон, ради которого заводился экран выбора; список из шестнадцати
// пунктов на входе есть шестнадцать требований разом. Здесь одна кнопка: начать.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import Link from "next/link";
import { PageShell } from "../../_components/page-shell";
import { Lead } from "@/components/ui/typography";
import { stepOneStrings, DEFAULT_TEMPLATE_TOTAL } from "./_strings";

export const dynamic = "force-dynamic";

export default async function DefaultTemplateIndex(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = stepOneStrings(lang);
  const ru = lang === "ru";

  return (
    <PageShell
      lang={lang}
      slug="project-start"
      s={s}
      params={{ file: "default-template" }}
      title={x.pageTitle}
      hint={x.pageHint}
    >
      <Lead>
        {ru
          ? `Путь состоит из ${DEFAULT_TEMPLATE_TOTAL} шагов. Показывается ровно один: тот, который вы делаете сейчас.`
          : `The way is ${DEFAULT_TEMPLATE_TOTAL} steps long. Exactly one is shown: the one you are doing now.`}
      </Lead>

      <Link
        href={`${adminHref(lang, "project-start")}/default-template/step-1`}
        className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-[length:var(--fs-small)] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {ru ? "Начать с первого шага" : "Start from step one"}
      </Link>
    </PageShell>
  );
}
