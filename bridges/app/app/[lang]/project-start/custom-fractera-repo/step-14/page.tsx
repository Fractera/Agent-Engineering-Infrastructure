// ШАГ ЧЕТЫРНАДЦАТЫЙ ВТОРОГО ПУТИ: ПРОЩАНИЕ (35-8, 2026-08-31).
//
// 🔒 ПРОЩАНИЕ ОДНО НА ДВА ПУТИ, И СЛОВА БЕРУТСЯ У ОДИННАДЦАТОГО ШАГА ПЕРВОГО.
// В конце обоих путей человек находится в одном и том же месте: у него работает
// проект на своём сервере, есть репозиторий и есть агент. Два разных прощания
// разошлись бы без причины — и разошлись бы в том, который реже открывают.
// Слова написаны владельцем; переписывать их «под второй путь» было бы правкой
// его текста без его слова.
//
// 🔒 ОТМЕТКА ПРИ ЭТОМ СВОЯ — `adopt-path-finished`. Слова общие, а ФАКТ разный:
// «я прошёл путь стартового шаблона» и «я прошёл путь чужого проекта» — не одно
// и то же. Общая отметка объявила бы второй путь пройденным тому, кто прошёл
// первый, и наоборот. ✗ ровно этим оплачен шаг 25.
//
// 🔒 ЭТО РАЗДЕЛЕНИЕ — ГЛАВНЫЙ УРОК ВСЕГО ШАГА 35 В ОДНОЙ СТРОКЕ: общими бывают
// СЛОВА и МЕХАНИКА, но никогда — состояние, отвечающее на вопрос «сделал ли это
// человек».

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../../../_components/page-shell";
import { StepSection } from "../../../_components/launch/step-section";
import { StepLocked } from "../../../_components/launch/step-locked";
import { StepCheck } from "../../../_components/launch/step-check.client";
import { StepNav } from "../../../_components/launch/step-nav";
import { StepCopyBlock } from "../../../_components/launch/step-grab.client";
import { Small } from "@/components/ui/typography";
import { flowMarked } from "@/lib/launch-flow";
import { stepElevenStrings } from "../../_shared/_step11";
import { ADOPT_PATH_TOTAL, adoptStepBuilt } from "../_strings";
import { adoptLockedFor } from "../_steps";

export const dynamic = "force-dynamic";

export default async function CustomFracteraRepoStepFourteen(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = stepElevenStrings(lang);
  const base = `${adminHref(lang, "project-start")}/custom-fractera-repo`;

  const locked = adoptLockedFor(lang, 14);
  if (locked) {
    return (
      <PageShell
        lang={lang}
        slug="project-start"
        s={s}
        tail={[{ label: "custom-fractera-repo", href: base }, { label: "step-14" }]}
        title={x.pageTitle}
        hint={x.pageHint}
      >
        <StepLocked
          title={x.title}
          message={locked.message}
          backHref={locked.backHref}
          backLabel={locked.backLabel}
        />
      </PageShell>
    );
  }

  const marked = flowMarked("adopt-path-finished");

  return (
    <PageShell
      lang={lang}
      slug="project-start"
      s={s}
      tail={[{ label: "custom-fractera-repo", href: base }, { label: "step-14" }]}
      title={x.pageTitle}
      hint={x.pageHint}
    >
      <StepSection
        index={14}
        total={ADOPT_PATH_TOTAL}
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
        stepHref={(n) => (adoptStepBuilt(n) ? `${base}/step-${n}` : undefined)}
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
            />
          </div>

          {marked ? (
            // Пятнадцатого шага нет и не будет — путь кончается здесь. Третье из
            // положений навигации, названных владельцем: только «назад».
            <StepNav
              prevHref={adoptStepBuilt(13) ? `${base}/step-13` : undefined}
              labels={{ goPrev: x.goPrev, goNext: x.goNext }}
            />
          ) : (
            <StepCheck
              index={14}
              total={ADOPT_PATH_TOTAL}
              mark="adopt-path-finished"
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
