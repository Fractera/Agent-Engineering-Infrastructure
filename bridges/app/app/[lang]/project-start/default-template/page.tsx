// ПОДСТРАНИЦА ПУТИ «СТАРТОВЫЙ ШАБЛОН» (шаг 28-9, 2026-08-27).
//
// 🔒 ЗАЧЕМ ОНА НУЖНА, ЕСЛИ ШАГИ — ОТДЕЛЬНЫЕ СТРАНИЦЫ. Владелец: «наша разделка
// пойдёт и создаст две подстраницы… дальше внутри каждого из них будут страницы
// Steps от начала и до конца». Эта страница и есть вход в путь: у пути должен
// быть адрес, на который можно вернуться, не помня номера шага.
//
// 🪦 ОТМЕНЕНО 2026-08-31 РЕШЕНИЕМ ВЛАДЕЛЬЦА (28-13). Здесь стояло: «она не
// показывает список шагов — показанное действие читается как требуемое, список из
// шестнадцати пунктов на входе есть шестнадцать требований разом».
//
// 🔒 ЕГО ДОВОД СИЛЬНЕЕ: КАРТА — НЕ НАБОР ТРЕБОВАНИЙ, А ОТВЕТ НА ВОПРОС «ГДЕ Я».
// Требование остаётся одно — открытый шаг; карта показывает, сколько пройдено и
// сколько осталось. Прежний довод верен для ШАГА и неверен для КАРТЫ.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import Link from "next/link";
import { PageShell } from "../../_components/page-shell";
import { Lead } from "@/components/ui/typography";
import { stepOneStrings, pathMapStrings } from "./_strings";
import { pathSteps, currentStep } from "./_steps";
import { StepMap } from "../../_components/launch/step-map";

export const dynamic = "force-dynamic";

export default async function DefaultTemplateIndex(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = stepOneStrings(lang);
  const m = pathMapStrings(lang);

  // Карта и кнопка читают ОДИН список: два перечисления разошлись бы на третьей
  // правке, и кнопка вела бы не туда, куда показывает карта.
  const steps = pathSteps(lang);
  const current = currentStep(steps);
  const base = `${adminHref(lang, "project-start")}/default-template`;

  return (
    <PageShell
      lang={lang}
      slug="project-start"
      s={s}
      params={{ file: "default-template" }}
      title={x.pageTitle}
      hint={x.pageHint}
    >
      <Lead>{m.lead}</Lead>

      <StepMap base={base} steps={steps} labels={{ stepWord: m.stepWord, doneWord: m.doneWord }} />

      {/* Кнопка ведёт на первый НЕЗАКРЫТЫЙ шаг: «продолжить» честнее, чем
          «начать сначала», у того, кто уже прошёл половину. Все закрыты —
          кнопки нет вовсе, и об этом сказано словами. */}
      {current ? (
        <Link
          href={`${base}/${current.slug}`}
          data-path-continue
          className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-[length:var(--fs-small)] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {current.n === 1 ? m.startLabel : `${m.continueLabel} — ${m.stepWord.toLowerCase()} ${current.n}`}
        </Link>
      ) : (
        <p className="mt-8 text-[length:var(--fs-small)] text-muted-foreground">{m.allDone}</p>
      )}
    </PageShell>
  );
}
