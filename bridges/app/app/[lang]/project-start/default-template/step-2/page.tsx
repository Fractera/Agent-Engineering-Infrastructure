// ШАГ ВТОРОЙ ПУТИ «СТАРТОВЫЙ ШАБЛОН»: ТОКЕН ДОСТУПА (28-10, 2026-08-27).
//
// 🔒 ОДНО ДЕЙСТВИЕ — ОДИН ШАГ. Здесь только выпуск и вставка токена. Проверка
// связи и отправка проекта — шаги третий и четвёртый; в живом мастере все четыре
// стоят внутри «шага 1 из 13», и это тот дефект, который владелец назвал словами
// «it must to be 4 steps , not 1».
//
// 🔒 ЧЕГО НА ЭТОМ ШАГЕ НАМЕРЕННО НЕТ: ссылки «открыть страницу токенов». В живом
// мастере она есть и полезна — ведёт на GitHub с уже выбранными правами. Но это
// ВТОРОЕ действие на шаге, а закон одного действия здесь и проверяется. Ссылка
// вернётся, когда владелец скажет, считать ли её действием или частью описания.
//
// 🔒 ТОКЕН — СЕКРЕТ, И ЭТО ВИДНО В КОДЕ. Поле не хранит значение нигде, кроме
// состояния островка, и на сервер сегодня ничего не уходит: дверь подключается по
// отдельному слову владельца, потому что она двигает состояние ЖИВОГО мастера.
// Когда дверь подключат, значение обязано уехать телом POST-запроса и никогда —
// строкой адреса.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../../../_components/page-shell";
import { StepSection } from "../../../_components/launch/step-section";
import { StepForm } from "../../../_components/launch/step-form.client";
import { stepTwoStrings, DEFAULT_TEMPLATE_TOTAL } from "../_strings";

export const dynamic = "force-dynamic";

export default async function DefaultTemplateStepTwo(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = stepTwoStrings(lang);

  return (
    <PageShell
      lang={lang}
      slug="project-start"
      s={s}
      params={{ file: "default-template", run: "step-2" }}
      title={x.pageTitle}
      hint={x.pageHint}
    >
      <StepSection
        index={2}
        total={DEFAULT_TEMPLATE_TOTAL}
        stepOfTemplate={x.stepOf}
        doneLabel={x.done}
        badge={x.badge}
        title={x.title}
        lead={x.lead}
        info={x.info}
        important={x.important}
        actionLead={x.actionLead}
        bullets={x.bullets}
      >
        {/* 🔒 Островку — только его слова, перечисленные поимённо. */}
        <StepForm
          index={2}
          total={DEFAULT_TEMPLATE_TOTAL}
          secret
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
          }}
          // Шага третьего ещё нет — перехода нет, и тост его не обещает.
          nextHref={undefined}
        />
      </StepSection>
    </PageShell>
  );
}
