// ШАГ ПЕРВЫЙ ВТОРОГО ПУТИ: АДРЕС ПРОЕКТА-ДОНОРА (35-1, 2026-08-31).
//
// 🔒 АСИММЕТРИЯ ПУТЕЙ НАЧИНАЕТСЯ ПРЯМО ЗДЕСЬ. У первого пути первый шаг спрашивает
// адрес СВОЕГО пустого репозитория — человек будет туда отправлять. Здесь он
// называет ЧУЖОЙ проект, из которого приедет код. Поля похожи, смысл
// противоположный, и потому ключ состояния свой: `donor-url`, а не `repo-url`.
// ✗ Общий ключ дал бы прошедшему первый путь загоревшийся шаг второго — то есть
// поздравление с тем, чего он не делал (оплачено шагом 25).
//
// 🔒 ЗАЩИТЫ ОТ ПРЫЖКА ЗДЕСЬ ПОКА НЕТ, И ЭТО НЕ ЗАБЫТО. Она читает перечисление
// шагов пути (`_steps.ts`), которого у второго пути ещё не существует: построен
// один шаг, и прыгать некуда. Перечисление и защита придут в 35-6 вместе с
// остальными шагами. Написать защиту раньше шагов значило бы сторожить пустоту.
//
// 🔒 АНАТОМИЯ ШАГА — ОБЩАЯ, ВЗЯТАЯ, А НЕ НАПИСАННАЯ ЗАНОВО. `StepSection` и
// `StepForm` те же, что у первого пути: порядок «бейдж → заголовок → лид →
// подсказки → действие» переставить снаружи нельзя, а любую часть можно не дать.
// ✗ Две секции, написанные по отдельности, разъезжаются — замер, оплаченный
// дважды (28-2 и 28-20).

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../../../_components/page-shell";
import { StepSection } from "../../../_components/launch/step-section";
import { StepForm } from "../../../_components/launch/step-form.client";
import { flowDone, flowShown } from "@/lib/launch-flow";
import { ADOPT_PATH_TOTAL, ADOPT_PATH_BUILT, adoptStepOneStrings } from "../_strings";

export const dynamic = "force-dynamic";

export default async function CustomFracteraRepoStepOne(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = adoptStepOneStrings(lang);

  return (
    <PageShell
      lang={lang}
      slug="project-start"
      s={s}
      // Хвост крошек — ссылками: путь показывает уровень, на который можно
      // вернуться (28-15).
      tail={[
        { label: "custom-fractera-repo", href: `${adminHref(lang, "project-start")}/custom-fractera-repo` },
        { label: "step-1" },
      ]}
      title={x.pageTitle}
      hint={x.pageHint}
    >
      <StepSection
        index={1}
        total={ADOPT_PATH_TOTAL}
        stepOfTemplate={x.stepOf}
        doneLabel={x.done}
        // Отметка рисуется от СОХРАНЁННОГО факта, а не от того, что человек
        // побывал на странице.
        done={flowDone("donor-url")}
        badge={x.badge}
        title={x.title}
        lead={x.lead}
        info={x.info}
        important={x.important}
        actionLead={x.actionLead}
        bullets={x.bullets}
        // Шкала кликабельна только по ПОСТРОЕННЫМ шагам: ссылка на несуществующий
        // ведёт в 404 (оплачено 28-11).
        stepHref={(n) =>
          n <= ADOPT_PATH_BUILT
            ? `${adminHref(lang, "project-start")}/custom-fractera-repo/step-${n}`
            : undefined
        }
      >
        {/* Островку — только его слова, перечисленные поимённо: тип не сужает
            рантайм, и объект целиком уехал бы по проводу со всем, что окажется в
            нём завтра. */}
        <StepForm
          index={1}
          total={ADOPT_PATH_TOTAL}
          flowStep="donor-url"
          saved={flowShown("donor-url")}
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
