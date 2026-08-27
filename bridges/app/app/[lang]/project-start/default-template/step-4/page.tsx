// ШАГ ЧЕТВЁРТЫЙ ПУТИ «СТАРТОВЫЙ ШАБЛОН»: ОТПРАВИТЬ ПРОЕКТ (28-21, 2026-08-27).
//
// 🔒 ЭТО ПОСЛЕДНИЙ ИЗ ЧЕТЫРЁХ, НА КОТОРЫЕ ВЛАДЕЛЕЦ ВЕЛЕЛ РАЗДЕЛИТЬ «ШАГ 1 ИЗ 13»:
// адрес · токен · проверка · отправка. Живой мастер требует все четыре внутри
// одного шага; здесь их четыре, и счётчик считает честно.
//
// 🔒 ЕДИНСТВЕННОЕ ДЕЙСТВИЕ ПУТИ, МЕНЯЮЩЕЕ ЧТО-ТО ВНЕ ПАНЕЛИ. Три предыдущих шага
// писали в своё состояние и спрашивали GitHub; этот кладёт файлы в чужой
// репозиторий. Отсюда главная мысль страницы, взятая у владельца дословно:
// «подключение данных не перемещает ни одного файла — перемещает отправка».
//
// 🔒 ОТМЕТКА ОТПРАВКИ НЕ ГАСНЕТ ПРИ СМЕНЕ ТОКЕНА, в отличие от отметки проверки.
// Проверка утверждает про нынешние данные, отправка — про случившееся событие:
// файлы уехали, и новый токен этого не отменяет.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../../../_components/page-shell";
import { StepSection } from "../../../_components/launch/step-section";
import { VerifyStep } from "../../../_components/launch/verify-step.client";
import { StepNav } from "../../../_components/launch/step-nav";
import { Small } from "@/components/ui/typography";
import { Check } from "lucide-react";
import { flowPushed, flowPushedAt, flowValue } from "@/lib/launch-flow";
import { DEFAULT_TEMPLATE_TOTAL, DEFAULT_TEMPLATE_BUILT } from "../_strings";
import { stepFourStrings } from "../_step4";

export const dynamic = "force-dynamic";

export default async function DefaultTemplateStepFour(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = stepFourStrings(lang);
  const pushed = flowPushed();
  const pushedAt = flowPushedAt();
  const repoUrl = flowValue("repo-url");

  return (
    <PageShell
      lang={lang}
      slug="project-start"
      s={s}
      tail={[
        { label: "default-template", href: `${adminHref(lang, "project-start")}/default-template` },
        { label: "step-4" },
      ]}
      title={x.pageTitle}
      hint={x.pageHint}
    >
      <StepSection
        index={4}
        total={DEFAULT_TEMPLATE_TOTAL}
        stepOfTemplate={x.stepOf}
        doneLabel={x.done}
        done={pushed}
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
        // 🔒 ССЫЛКА ВЕДЁТ НА РЕПОЗИТОРИЙ ЧЕЛОВЕКА, А НЕ НА ФОРМУ GITHUB, и это
        // единственное место пути, где так. На шагах 1 и 2 ссылка отвечала на
        // вопрос «куда идти делать»; здесь — на вопрос «как убедиться, что
        // получилось». Владелец назвал это прямо: «личный способ для того, чтобы
        // пользователь мог проверить, добрался ли новый код до его репозитория».
        //
        // 🔒 АДРЕС БЕРЁТСЯ ИЗ СОХРАНЁННОГО ЗНАЧЕНИЯ ПЕРВОГО ШАГА. Собрать его
        // заново из чего-либо ещё значило бы завести второй источник правды об
        // одном факте; нет сохранённого адреса — нет и ссылки, а не ссылка в
        // никуда.
        //
        // Открывается в новой вкладке (это делает `StepLink`): уйдя из панели в
        // том же окне, человек теряет шаг и возвращается кнопкой «назад», если
        // догадается.
        link={repoUrl ? { href: repoUrl, label: x.linkLabel } : undefined}
      >
        <div className="flex flex-col gap-5">
          {pushed && (
            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/[0.06] px-3.5 py-2.5">
              <Check size={16} aria-hidden className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              <Small className="text-emerald-700 dark:text-emerald-300">
                {x.pushedAt} {new Date(pushedAt).toLocaleString(lang === "ru" ? "ru-RU" : "en-GB")}
              </Small>
            </div>
          )}

          {pushed ? (
            // Пятого шага ещё нет — вперёд вести некуда, и кнопки «вперёд» нет.
            // Это третье из положений, названных владельцем: только «назад».
            <StepNav
              prevHref={`${adminHref(lang, "project-start")}/default-template/step-3`}
              nextHref={
                DEFAULT_TEMPLATE_BUILT >= 5
                  ? `${adminHref(lang, "project-start")}/default-template/step-5`
                  : undefined
              }
              labels={{ goPrev: x.goPrev, goNext: x.goNext }}
            />
          ) : (
            <VerifyStep
              endpoint="/api/config/launch-flow/push"
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
        </div>
      </StepSection>
    </PageShell>
  );
}
