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
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../../../_components/page-shell";
import { StepSection } from "../../../_components/launch/step-section";
import { StepForm } from "../../../_components/launch/step-form.client";
import { stepTwoStrings, DEFAULT_TEMPLATE_TOTAL, DEFAULT_TEMPLATE_BUILT } from "../_strings";

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
      tail={[
        { label: "default-template", href: `${adminHref(lang, "project-start")}/default-template` },
        { label: "step-2" },
      ]}
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
        // 🔒 ШКАЛА КЛИКАБЕЛЬНА (28-15): прыжок вперёд-назад одним нажатием на
        // отрезок. Адреса шагов знает ПУТЬ, а не анатомия шага.
        stepHref={(n) =>
          n <= DEFAULT_TEMPLATE_BUILT
            ? `${adminHref(lang, "project-start")}/default-template/step-${n}`
            : undefined
        }
        // 🔒 СНИМОК ЧУЖОГО ЭКРАНА — его прислал владелец 2026-08-27 со словами
        // «в данный момент я показываю, где брать токен». Шаг объясняет словами
        // то, что человек ищет ГЛАЗАМИ на странице GitHub: где «Select scopes»,
        // какая галочка первая, как выглядит «No expiration».
        // Обе строки необязательны в типе: снимок есть не у каждого шага.
        // Отдаём его только когда есть ОБЕ — картинка без `alt` для читалки
        // экрана пустое место, а без подписи не сказано, чей это экран.
        shot={
          x.shotAlt && x.shotCaption
            ? {
                src: "/images/launch/step-2-token-scopes.png",
                alt: x.shotAlt,
                caption: x.shotCaption,
              }
            : undefined
        }
        // 🔒 ССЫЛКА-ДЕЙСТВИЕ ВЕРНУЛАСЬ — решение владельца отменило моё. Строя
        // этот шаг, я не перенёс её из живого мастера, сочтя вторым действием.
        // Адрес тот же, что там: раздел «Tokens (classic)».
        link={{ href: "https://github.com/settings/tokens", label: x.linkLabel }}
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
          // 🔒 ПЕРЕХОД ПОЯВИЛСЯ ВМЕСТЕ С ШАГОМ 3 (28-16). До этого его здесь не
          // было намеренно: шага не существовало, и тост его не обещал.
          nextHref={`${adminHref(lang, "project-start")}/default-template/step-3`}
        />
      </StepSection>
    </PageShell>
  );
}
