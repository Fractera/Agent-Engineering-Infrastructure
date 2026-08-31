// ШАГ ОДИННАДЦАТЫЙ: ПРОЩАНИЕ И ГЛАВНЫЙ СОВЕТ (65-2, 2026-08-31).
//
// 🔒 ОН НЕ РАБОЧИЙ, И ЭТО РЕШЕНИЕ ВЛАДЕЛЬЦА. Десятый шаг — последний, связанный
// с разработкой; здесь человека отпускают. Задания нет: есть один совет, одна
// фраза, которую стоит унести с собой, и отметка «прочитал».
//
// 🔒 ОТМЕТКА СВОЯ — `path-finished`. Заимствовать `deployed-seen` десятого шага
// значило бы объявить путь пройденным тому, кто просто развернул проект и до
// прощания не дошёл. ✗ ровно этим оплачен шаг 25.
//
// 🔒 ЗАКРЫВАЕТ ЧЕЛОВЕК, И ОТМЕТКА СНИМАЕМАЯ, как у всех шагов этого рода: путь
// можно пройти заново, и «когда-то дочитал» — не то же самое, что «здесь и
// сейчас всё понятно».

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../../../_components/page-shell";
import { StepSection } from "../../../_components/launch/step-section";
import { pathSteps, stepOpen, currentStep } from "../_steps";
import { pathMapStrings } from "../_strings";
import { StepLocked } from "../../../_components/launch/step-locked";
import { StepCheck } from "../../../_components/launch/step-check.client";
import { StepNav } from "../../../_components/launch/step-nav";
import { StepCopyBlock } from "../../../_components/launch/step-grab.client";
import { Small } from "@/components/ui/typography";
import { flowMarked } from "@/lib/launch-flow";
import { DEFAULT_TEMPLATE_TOTAL, DEFAULT_TEMPLATE_BUILT } from "../_strings";
import { stepElevenStrings } from "../../_shared/_step11";

export const dynamic = "force-dynamic";

export default async function DefaultTemplateStepEleven(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = stepElevenStrings(lang);

  // 🔒 ЗАЩИТА ОТ ПРЫЖКА ВПЕРЁД (28-13). Открыт шаг, у которого закрыты все
  // предыдущие. Пройденный шаг остаётся открытым: вернуться человек вправе.
  const flowSteps = pathSteps(lang);
  if (!stepOpen(flowSteps, 11)) {
    const back = currentStep(flowSteps);
    const m = pathMapStrings(lang);
    const backN = back ? back.n : 1;
    return (
      <PageShell
        lang={lang}
        slug="project-start"
        s={s}
        tail={[
          { label: "default-template", href: `${adminHref(lang, "project-start")}/default-template` },
          { label: "step-11" },
        ]}
        title={x.pageTitle}
        hint={x.pageHint}
      >
        <StepLocked
          title={x.title}
          message={m.lockedMessage.replace("{n}", String(backN))}
          backHref={`${adminHref(lang, "project-start")}/default-template/step-${backN}`}
          backLabel={m.lockedBack.replace("{n}", String(backN))}
        />
      </PageShell>
    );
  }

  const marked = flowMarked("path-finished");

  return (
    <PageShell
      lang={lang}
      slug="project-start"
      s={s}
      tail={[
        { label: "default-template", href: `${adminHref(lang, "project-start")}/default-template` },
        { label: "step-11" },
      ]}
      title={x.pageTitle}
      hint={x.pageHint}
    >
      <StepSection
        index={11}
        total={DEFAULT_TEMPLATE_TOTAL}
        stepOfTemplate={x.stepOf}
        doneLabel={x.done}
        done={marked}
        badge={x.badge}
        title={x.title}
        lead={x.lead}
        // Голубая — что проект о себе знает и где границы этого знания.
        info={x.info}
        // Оранжевая — тот самый главный совет.
        important={x.important}
        actionLead={x.actionLead}
        bullets={x.bullets}
        stepHref={(n) =>
          n <= DEFAULT_TEMPLATE_BUILT
            ? `${adminHref(lang, "project-start")}/default-template/step-${n}`
            : undefined
        }
      >
        {/* 🔒 ОСТРОВКАМ — ТОЛЬКО ИХ СЛОВА, ПЕРЕЧИСЛЕННЫЕ ПОИМЁННО. */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Small className="text-[var(--muted-foreground)]">{x.promptLead}</Small>
            <StepCopyBlock
              text={x.promptText}
              label={x.copyLabel}
              copiedLabel={x.copiedLabel}
              toastTitle={x.copyToast}
              failureLabel={x.copyFailed}
            />
          </div>

          {marked ? (
            // Следующего шага нет и не будет: путь кончается здесь.
            <StepNav
              prevHref={`${adminHref(lang, "project-start")}/default-template/step-10`}
              labels={{ goPrev: x.goPrev, goNext: x.goNext }}
            />
          ) : (
            <StepCheck
              index={11}
              total={DEFAULT_TEMPLATE_TOTAL}
              mark="path-finished"
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
        </div>
      </StepSection>
    </PageShell>
  );
}
