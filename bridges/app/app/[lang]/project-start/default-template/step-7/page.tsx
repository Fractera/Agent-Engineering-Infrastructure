// ШАГ СЕДЬМОЙ ПУТИ «СТАРТОВЫЙ ШАБЛОН»: ОТКРЫТЬ ПАПКУ В CLAUDE CODE (28-26).
//
// 🔒 СНИМОК ПРИСЛАН ВЛАДЕЛЬЦЕМ 2026-08-28 со словами «приложи этот файл в
// качестве иллюстрации». Он изображает окно Claude Code в момент выбора папки —
// то есть ровно это действие, а не заведение папки в проводнике. Поэтому снимок
// стоит здесь, а не на шаге шестом: картинка обязана показывать то, о чём
// говорит шаг, иначе она не помогает, а сбивает.
//
// 🔒 ШАГ ЗАКРЫВАЕТ ЧЕЛОВЕК — и здесь у этого есть вторая причина, названная
// владельцем в тексте живого мастера: проверку выполняет САМ АГЕНТ, отвечая на
// вопрос «в какой папке ты работаешь». Панель этого разговора не слышит.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../../../_components/page-shell";
import { StepSection } from "../../../_components/launch/step-section";
import { StepCheck } from "../../../_components/launch/step-check.client";
import { StepNav } from "../../../_components/launch/step-nav";
import { flowMarked } from "@/lib/launch-flow";
import { DEFAULT_TEMPLATE_TOTAL, DEFAULT_TEMPLATE_BUILT } from "../_strings";
import { stepSevenStrings } from "../_step7";

export const dynamic = "force-dynamic";

export default async function DefaultTemplateStepSeven(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = stepSevenStrings(lang);
  const marked = flowMarked("open-folder");

  return (
    <PageShell
      lang={lang}
      slug="project-start"
      s={s}
      tail={[
        { label: "default-template", href: `${adminHref(lang, "project-start")}/default-template` },
        { label: "step-7" },
      ]}
      title={x.pageTitle}
      hint={x.pageHint}
    >
      <StepSection
        index={7}
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
        shot={{
          src: "/images/launch/step-7-open-folder.png",
          alt: x.shotAlt,
          caption: x.shotCaption,
        }}
      >
        {marked ? (
          // Восьмого шага ещё нет — вперёд вести некуда.
          <StepNav
            prevHref={`${adminHref(lang, "project-start")}/default-template/step-6`}
            nextHref={
              DEFAULT_TEMPLATE_BUILT >= 8
                ? `${adminHref(lang, "project-start")}/default-template/step-8`
                : undefined
            }
            labels={{ goPrev: x.goPrev, goNext: x.goNext }}
          />
        ) : (
          <StepCheck
            index={7}
            total={DEFAULT_TEMPLATE_TOTAL}
            mark="open-folder"
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
