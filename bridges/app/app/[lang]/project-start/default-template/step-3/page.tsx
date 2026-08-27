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
import { Callout } from "../../../_components/launch/callout";
import { Small } from "@/components/ui/typography";
import { DEFAULT_TEMPLATE_TOTAL, DEFAULT_TEMPLATE_BUILT } from "../_strings";
import { stepThreeStrings } from "../_step3";

export const dynamic = "force-dynamic";

export default async function DefaultTemplateStepThree(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = stepThreeStrings(lang);

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
          {/* Кнопка есть, но не работает — и рядом сказано почему. Ни одного
              островка: нажимать нечего, значит и JS в браузер везти незачем. */}
          <button
            type="button"
            disabled
            data-step-cta
            className="inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-lg bg-primary px-4 text-[length:var(--fs-small)] font-medium text-primary-foreground opacity-50"
          >
            {x.cta}
          </button>

          <Callout tone="important">
            <span className="font-semibold">{x.pendingTitle}</span> {x.pendingBody}
          </Callout>

          <Small>{x.pendingWhy}</Small>
        </div>
      </StepSection>
    </PageShell>
  );
}
