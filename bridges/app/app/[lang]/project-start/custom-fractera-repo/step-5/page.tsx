// ШАГ 6 ВТОРОГО ПУТИ (35-6, 2026-08-31).
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
import { VerifyStep } from "../../../_components/launch/verify-step.client";
import { StepNav } from "../../../_components/launch/step-nav";
import { flowVerified } from "@/lib/launch-flow";
import { ADOPT_PATH_TOTAL, adoptStepBuilt, stepBadge } from "../_strings";
import { adoptVerifyStrings } from "../_verify";

export const dynamic = "force-dynamic";

// 🔒 Отметка ГАСНЕТ при смене адреса или токена: проверено было ТО, что стояло в
// ту минуту.

export default async function CustomFracteraRepoStepSix(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = adoptVerifyStrings(lang);
  const base = `${adminHref(lang, "project-start")}/custom-fractera-repo`;
  const done = flowVerified("adopt");

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
        done={done}
        badge={stepBadge(lang, 5)}
        title={x.title}
        lead={x.lead}
        info={x.info}
        important={x.important}
        actionLead={x.actionLead}
        bullets={x.bullets}
        stepHref={(k) => (adoptStepBuilt(k) ? `${base}/step-${k}` : undefined)}
      >
        {done ? (
          <StepNav
            prevHref={adoptStepBuilt(4) ? `${base}/step-4` : undefined}
            nextHref={adoptStepBuilt(6) ? `${base}/step-6` : undefined}
            labels={{ goPrev: x.goPrev, goNext: x.goNext }}
          />
        ) : (
          <VerifyStep
            endpoint="/api/config/launch-flow/verify"
            // 🔒 Путь называется явно: механика двери одна, а пара «адрес и
            // токен», о которой спрашивают, у каждого пути своя.
            payload={{ path: "adopt" }}
            labels={{
              cta: x.cta,
              busy: x.busy,
              successTitle: x.successTitle,
              successHint: x.successHint,
              failureTitle: x.failureTitle,
              reasons: x.reasons,
              reasonUnknown: x.reasonUnknown,
            }}
          />
        )}
      </StepSection>
    </PageShell>
  );
}
