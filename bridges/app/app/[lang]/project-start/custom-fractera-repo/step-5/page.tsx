// ШАГ 4 ВТОРОГО ПУТИ (35-6, 2026-08-31).
//
// 🔒 МЕХАНИКА ВЗЯТА У ПЕРВОГО ПУТИ ЦЕЛИКОМ: та же форма, та же дверь, тот же
// островок. Отличаются СОСТОЯНИЕ (свои ключи) и СЛОВА. Второй экземпляр этой
// механики разошёлся бы с первым молча — тем же законом, что и в 35-5.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../../../_components/page-shell";
import { StepLocked } from "../../../_components/launch/step-locked";
import { adoptLockedFor } from "../_steps";
import { StepSection } from "../../../_components/launch/step-section";
import { StepForm } from "../../../_components/launch/step-form.client";
import { StepLink } from "../../../_components/launch/step-link";
import { flowDone, flowShown } from "@/lib/launch-flow";
import { ADOPT_PATH_TOTAL, adoptStepBuilt, stepBadge } from "../_strings";
import { adoptOwnRepoStrings } from "../_own-repo";

export const dynamic = "force-dynamic";

export default async function CustomFracteraRepoStepFour(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = adoptOwnRepoStrings(lang);
  const base = `${adminHref(lang, "project-start")}/custom-fractera-repo`;

  // 🔒 ЗАЩИТА ОТ ПРЫЖКА ВПЕРЁД (35-6). Открыт шаг, у которого закрыты все
  // предыдущие; пройденный остаётся открытым — вернуться человек вправе (28-18).
  // Заголовок показывается и у запертого: страница без заголовка читается как
  // поломка, а не как «рано» (решение владельца, 28-13).
  const locked = adoptLockedFor(lang, 5);
  if (locked) {
    return (
      <PageShell
        lang={lang}
        slug="project-start"
        s={s}
        tail={[
          { label: "custom-fractera-repo", href: `${adminHref(lang, "project-start")}/custom-fractera-repo` },
          { label: "step-5" },
        ]}
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

  return (
    <PageShell
      lang={lang}
      slug="project-start"
      s={s}
      tail={[{ label: "custom-fractera-repo", href: base }, { label: "step-5" }]}
      title={x.pageTitle}
      hint={x.pageHint}
    >
      <StepSection
        index={5}
        total={ADOPT_PATH_TOTAL}
        stepOfTemplate={x.stepOf}
        doneLabel={x.done}
        done={flowDone("adopt-repo-url")}
        badge={stepBadge(lang, 5)}
        title={x.title}
        lead={x.lead}
        info={x.info}
        important={x.important}
        actionLead={x.actionLead}
        bullets={x.bullets}
        link={{ href: "https://github.com/new", label: x.linkLabel }}
        stepHref={(k) => (adoptStepBuilt(k) ? `${base}/step-${k}` : undefined)}
      >
        {/* Островку — только его слова, перечисленные поимённо. */}
        <StepForm
          index={5}
          total={ADOPT_PATH_TOTAL}
          flowStep="adopt-repo-url"
          saved={flowShown("adopt-repo-url")}
          secret={false}
          prevHref={adoptStepBuilt(5) ? `${base}/step-5` : undefined}
          nextHref={adoptStepBuilt(6) ? `${base}/step-6` : undefined}
          labels={{
            inputLabel: x.form.inputLabel,
            inputPlaceholder: x.form.inputPlaceholder,
            inputHint: x.form.inputHint,
            cta: x.form.cta,
            busy: x.form.busy,
            successTitle: x.form.successTitle,
            successHint: x.form.successHint,
            failureTitle: x.form.failureTitle,
            failureFix: x.form.failureFix,
            goPrev: x.goPrev,
            goNext: x.goNext,
            replace: x.replace,
          }}
        />
      </StepSection>
    </PageShell>
  );
}
