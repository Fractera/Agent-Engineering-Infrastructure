// ШАГ ШЕСТОЙ ПУТИ «СТАРТОВЫЙ ШАБЛОН»: ОТДЕЛЬНАЯ ПАПКА (28-26, 2026-08-28).
//
// 🔒 ПОРЯДОК ВЗЯТ ИЗ ЖИВОГО МАСТЕРА, А НЕ ВЫДУМАН. В `lib/launch.shared.ts`
// после `claude-code` идёт `folder`, за ним `open-folder`. Владелец спросил:
// «следующий шаг посвящён подключению папки, не так ли?» — и он прав, но
// подключений здесь ДВА, и живой мастер их уже различает: сначала завести папку,
// потом открыть её в Claude Code. Мы это различение сохраняем.
//
// 🔒 ЭТОТ ШАГ ЗАКРЫВАЕТ ЧЕЛОВЕК. Папка живёт на его диске; у панели, работающей
// на сервере, нет ни глаз, ни канала, чтобы это проверить. Рисовать зелёное от
// собственной догадки — дефект, оплаченный в шаге 25.
//
// 🔒 НИ ССЫЛКИ, НИ СНИМКА — и то и другое объяснено в `_step6.ts`. Коротко: у
// действия «создать папку» нет адреса, а чужой проводник ничего не объясняет.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../../../_components/page-shell";
import { StepSection } from "../../../_components/launch/step-section";
import { StepCheck } from "../../../_components/launch/step-check.client";
import { StepNav } from "../../../_components/launch/step-nav";
import { flowMarked } from "@/lib/launch-flow";
import { DEFAULT_TEMPLATE_TOTAL, DEFAULT_TEMPLATE_BUILT } from "../_strings";
import { stepSixStrings } from "../_step6";

export const dynamic = "force-dynamic";

export default async function DefaultTemplateStepSix(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = stepSixStrings(lang);
  const marked = flowMarked("folder");

  return (
    <PageShell
      lang={lang}
      slug="project-start"
      s={s}
      tail={[
        { label: "default-template", href: `${adminHref(lang, "project-start")}/default-template` },
        { label: "step-6" },
      ]}
      title={x.pageTitle}
      hint={x.pageHint}
    >
      <StepSection
        index={6}
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
      >
        {marked ? (
          <StepNav
            prevHref={`${adminHref(lang, "project-start")}/default-template/step-5`}
            nextHref={
              DEFAULT_TEMPLATE_BUILT >= 7
                ? `${adminHref(lang, "project-start")}/default-template/step-7`
                : undefined
            }
            labels={{ goPrev: x.goPrev, goNext: x.goNext }}
          />
        ) : (
          <StepCheck
            index={6}
            total={DEFAULT_TEMPLATE_TOTAL}
            mark="folder"
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
