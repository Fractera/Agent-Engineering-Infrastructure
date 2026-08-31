// ПОДСТРАНИЦА ПУТИ «СВОЙ РЕПОЗИТОРИЙ FRACTERA» (28-9, 2026-08-27; путь начат 35-1, 2026-08-31).
//
// 🪦 ЗДЕСЬ СТОЯЛА ЧЕСТНАЯ ЗАГЛУШКА, И ОНА СВОЁ ОТСЛУЖИЛА. Текст был: «шаги этого
// пути ещё не построены» плюс обещание, что тут будет проверка донора и клон в
// соседнюю папку. Заглушка была правильной ровно до того дня, когда шаги
// появились: названная, но не обеспеченная возможность — приглашение
// импровизировать, а пустая страница с честной строкой лучше живой на вид кнопки,
// которая никуда не ведёт.
//
// 🔒 КАРТА ПУТИ ПРИШЛА ВМЕСТЕ С ШАГАМИ, КАК И БЫЛО ОБЕЩАНО (35-8). Пока был
// построен один шаг, карта из одной строки была бы не картой, а кнопкой с лишней
// рамкой. Теперь построены все четырнадцать, и карта отвечает на вопрос «где я»
// — тот же элемент `StepMap`, что у первого пути, и те же слова: она принадлежит
// не пути, а самой карте.

import Link from "next/link";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../../_components/page-shell";
import { Lead } from "@/components/ui/typography";
import { adoptPathStrings, adoptStepOneStrings } from "./_strings";
import { adoptSteps, adoptCurrentStep } from "./_steps";
import { pathMapStrings } from "../default-template/_strings";
import { StepMap } from "../../_components/launch/step-map";

export const dynamic = "force-dynamic";

export default async function CustomFracteraRepoIndex(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = adoptStepOneStrings(lang);
  const p = adoptPathStrings(lang);
  const m = pathMapStrings(lang);
  const steps = adoptSteps(lang);
  const base = `${adminHref(lang, "project-start")}/custom-fractera-repo`;
  // Кнопка ведёт на первый НЕЗАКРЫТЫЙ шаг, а не всегда на первый: вернувшийся
  // человек продолжает с того места, где остановился.
  const next = adoptCurrentStep(steps);

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

      {/* Карта показывает ПОСТРОЕННОЕ и пройденное — тот же элемент и те же
          слова, что у первого пути. */}
      <StepMap
        base={base}
        steps={steps}
        labels={{ stepWord: m.stepWord, doneWord: m.doneWord, todoWord: m.todoWord }}
      />

      <Link
        href={`${base}/step-${next ? next.n : 1}`}
        data-adopt-start
        className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-[length:var(--fs-small)] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {p.startLabel}
      </Link>
    </PageShell>
  );
}
