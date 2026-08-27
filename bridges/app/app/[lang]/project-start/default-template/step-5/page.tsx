// ШАГ ПЯТЫЙ ПУТИ «СТАРТОВЫЙ ШАБЛОН»: CLAUDE CODE (28-23, 2026-08-27).
//
// 🔒 ПОРЯДОК ВЗЯТ ИЗ ЖИВОГО МАСТЕРА, А НЕ ВЫДУМАН. Владелец спросил: «если
// следующий шаг про установку Claude, ссылка `https://claude.com/download`, нет?»
// — и он прав. В `lib/launch.shared.ts` после `repo`/`key`/`upload` идёт
// `claude-code`; первые три мы разделили на четыре шага, `key` исчез по 28-22,
// значит пятым честно становится Claude Code.
//
// 🔒 ЭТОТ ШАГ ЗАКРЫВАЕТ ЧЕЛОВЕК, И ИНАЧЕ НЕЛЬЗЯ. Claude Code живёт на его
// машине; панель работает на сервере, и канала для вопроса «поставил ли» между
// ними нет. Отсюда третий вид действия — сообщение факта, а не проверка и не
// сохранение значения.
//
// 🔒 ССЫЛКА — `https://claude.com/download`, названа владельцем. Она отвечает на
// тот же вопрос, что ссылки шагов 1 и 2: КУДА идти делать.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../../../_components/page-shell";
import { StepSection } from "../../../_components/launch/step-section";
import { StepCheck } from "../../../_components/launch/step-check.client";
import { StepNav } from "../../../_components/launch/step-nav";
import { flowMarked } from "@/lib/launch-flow";
import { DEFAULT_TEMPLATE_TOTAL, DEFAULT_TEMPLATE_BUILT } from "../_strings";
import { stepFiveStrings } from "../_step5";

export const dynamic = "force-dynamic";

export default async function DefaultTemplateStepFive(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = stepFiveStrings(lang);
  const marked = flowMarked("claude-code");

  return (
    <PageShell
      lang={lang}
      slug="project-start"
      s={s}
      tail={[
        { label: "default-template", href: `${adminHref(lang, "project-start")}/default-template` },
        { label: "step-5" },
      ]}
      title={x.pageTitle}
      hint={x.pageHint}
    >
      <StepSection
        index={5}
        total={DEFAULT_TEMPLATE_TOTAL}
        stepOfTemplate={x.stepOf}
        doneLabel={x.done}
        done={marked}
        badge={x.badge}
        title={x.title}
        lead={x.lead}
        info={x.info}
        important={x.important}
        actionLead={x.actionLead}
        bullets={x.bullets}
        stepHref={(n) =>
          n <= DEFAULT_TEMPLATE_BUILT
            ? `${adminHref(lang, "project-start")}/default-template/step-${n}`
            : undefined
        }
        link={{ href: "https://claude.com/download", label: x.linkLabel }}
      >
        {marked ? (
          // Шестого шага ещё нет — вперёд вести некуда. Третье из положений,
          // названных владельцем: только «назад».
          <StepNav
            prevHref={`${adminHref(lang, "project-start")}/default-template/step-4`}
            nextHref={
              DEFAULT_TEMPLATE_BUILT >= 6
                ? `${adminHref(lang, "project-start")}/default-template/step-6`
                : undefined
            }
            labels={{ goPrev: x.goPrev, goNext: x.goNext }}
          />
        ) : (
          <StepCheck
            index={5}
            total={DEFAULT_TEMPLATE_TOTAL}
            mark="claude-code"
            marked={marked}
            labels={{
              checkLabel: x.checkLabel,
              cta: x.cta,
              busy: x.busy,
              successTitle: x.successTitle,
              successHint: x.successHint,
              failureTitle: x.failureTitle,
              failureFix: x.failureFix,
            }}
          />
        )}
      </StepSection>
    </PageShell>
  );
}
