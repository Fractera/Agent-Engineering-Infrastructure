// ШАГ ТРЕТИЙ ПУТИ «СТАРТОВЫЙ ШАБЛОН»: ПРОВЕРКА СВЯЗИ (28-16, 2026-08-27).
//
// 🔒 ЭТО ШАГ ДРУГОГО РОДА, И РАЗНИЦА СОДЕРЖАТЕЛЬНАЯ. Шаги 1 и 2 закрывает
// ЧЕЛОВЕК: он вставил адрес, он вставил токен. Этот закрывает МАШИНА — ответ
// GitHub на вопрос «достают ли эти данные до этого репозитория». Человек не
// может поставить такую отметку из вежливости, и галочки «я это сделал» здесь
// поэтому нет вовсе.
//
// Закон живёт в `CLAUDE.md` с шага 25: «`verified` закрывает машина — человек не
// может поставить такую галочку, дверь `step` отвечает 409». Здесь он исполнен
// формой страницы: закрывать нечем, кроме проверки.
//
// 🛑 ПРОВЕРКА ПОКА НЕ ПОДКЛЮЧЕНА, И КНОПКА ЭТОГО НЕ СКРЫВАЕТ. Настоящая проверка
// — дверь `POST /api/config/launch/verify`; она пишет отметку в состояние ЖИВОГО
// мастера, а его владелец запретил трогать до отдельного слова. Поэтому кнопка
// стоит НЕАКТИВНОЙ, а рядом сказано, чего именно не хватает.
//
// ✗ ПОЧЕМУ НЕ «КНОПКА, КОТОРАЯ ПОКАЖЕТ ТОСТ». Тост об удаче был бы ложью о
// работе шага: страница объявила бы связь проверенной, ничего не спросив у
// GitHub. Тост об отказе на каждое нажатие — мёртвая кнопка, которая выглядит
// живой. Третий раз за день я едва не построил названную, но не обеспеченную
// возможность; неактивная кнопка с честной строкой — единственный вид, который
// не врёт.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../../../_components/page-shell";
import { StepSection } from "../../../_components/launch/step-section";
import { VerifyStep } from "../../../_components/launch/verify-step.client";
import { StepNav } from "../../../_components/launch/step-nav";
import { Small } from "@/components/ui/typography";
import { Check } from "lucide-react";
import { flowVerified, flowVerifiedAt } from "@/lib/launch-flow";
import { DEFAULT_TEMPLATE_TOTAL, DEFAULT_TEMPLATE_BUILT } from "../_strings";
import { stepThreeStrings } from "../_step3";

export const dynamic = "force-dynamic";

export default async function DefaultTemplateStepThree(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = stepThreeStrings(lang);
  const verified = flowVerified();
  const verifiedAt = flowVerifiedAt();

  return (
    <PageShell
      lang={lang}
      slug="project-start"
      s={s}
      tail={[
        { label: "default-template", href: `${adminHref(lang, "project-start")}/default-template` },
        { label: "step-3" },
      ]}
      title={x.pageTitle}
      hint={x.pageHint}
    >
      <StepSection
        index={3}
        total={DEFAULT_TEMPLATE_TOTAL}
        stepOfTemplate={x.stepOf}
        doneLabel={x.done}
        // 🔒 Зелёный круг — от ОТВЕТА GITHUB, а не от нажатия. Отметка гаснет
        // при любой смене адреса или токена: проверено было то, что стояло тогда.
        done={verified}
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
        <div className="flex flex-col gap-5">
          {/* 🔒 ПРОВЕРКА ПОДКЛЮЧЕНА (28-19, по слову владельца «go to finish
              it»). Кнопка больше не выключена: она задаёт настоящий вопрос
              GitHub. Островку отдаются только его слова, перечисленные
              поимённо. */}
          {verified && (
            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/[0.06] px-3.5 py-2.5">
              <Check size={16} aria-hidden className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              <Small className="text-emerald-700 dark:text-emerald-300">
                {x.verifiedAt} {new Date(verifiedAt).toLocaleString(lang === "ru" ? "ru-RU" : "en-GB")}
              </Small>
            </div>
          )}

          {/* 🔒 ПРОЙДЕННЫЙ ШАГ ПОКАЗЫВАЕТ НАВИГАЦИЮ, А НЕ ДЕЙСТВИЕ — то же
              правило, что у шагов с формой. Здесь оно молчало: я положил его
              внутрь `StepForm`, а у машинного шага формы нет. Владелец нашёл
              это, нажав проверку и оставшись с той же кнопкой. */}
          {verified ? (
            <StepNav
              prevHref={`${adminHref(lang, "project-start")}/default-template/step-2`}
              nextHref={
                DEFAULT_TEMPLATE_BUILT >= 4
                  ? `${adminHref(lang, "project-start")}/default-template/step-4`
                  : undefined
              }
              labels={{ goPrev: x.goPrev, goNext: x.goNext }}
            />
          ) : (
          <VerifyStep
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
