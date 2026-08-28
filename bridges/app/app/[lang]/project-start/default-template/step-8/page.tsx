// ШАГ ВОСЬМОЙ: ЗАПУСК НА ЛОКАЛЬНОЙ МАШИНЕ (28-28, 2026-08-28).
//
// 🔒 ЗДЕСЬ СХЛОПНУТА ЦЕЛАЯ ВЕРЕНИЦА ПРЕЖНИХ ШАГОВ, и это решение владельца, а не
// упрощение по дороге: раньше человек вставлял репозиторий, разворачивал проект,
// потом шёл за ключами в соседнюю вкладку. Сегодня `api/config/env-export` отдаёт
// одним файлом всё — адрес слоя данных, ключи, доступ к серверу и переменные
// слота вместе с адресом репозитория. Значит вкладок больше не нужно.
//
// 🔒 ГОЛУБАЯ ПОДСКАЗКА ЗНАЕТ РЕЖИМ СЕРВЕРА, А НЕ УГАДЫВАЕТ ЕГО. `publicSiteUrl()`
// спрашивает окружение (защищённый режим) и базу (имя домена) и отдаёт либо
// `https://домен`, либо `http://IP:3000`. Написать «ваш домен» вообще значило бы
// заставить человека гадать, о чём речь.
//
// 🔒 ДЕЙСТВИЕ ШАГА ОДНО — ГАЛОЧКА. Кнопка выдачи и блок подсказки действиями шага
// не являются: они дают материал, а закрывает шаг человек, увидевший проект в
// браузере. Панель этого увидеть не может — у неё нет глаз на его машине.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../../../_components/page-shell";
import { StepSection } from "../../../_components/launch/step-section";
import { StepCheck } from "../../../_components/launch/step-check.client";
import { StepNav } from "../../../_components/launch/step-nav";
import { StepGrabButton, StepCopyBlock } from "../../../_components/launch/step-grab.client";
import { Small } from "@/components/ui/typography";
import { flowMarked } from "@/lib/launch-flow";
import { publicSiteUrl } from "@/lib/public-site-url";
import { DEFAULT_TEMPLATE_TOTAL, DEFAULT_TEMPLATE_BUILT } from "../_strings";
import { stepEightStrings, localVsPublic } from "../_step8";

export const dynamic = "force-dynamic";

export default async function DefaultTemplateStepEight(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = stepEightStrings(lang);
  const marked = flowMarked("local-run");
  const site = publicSiteUrl();

  return (
    <PageShell
      lang={lang}
      slug="project-start"
      s={s}
      tail={[
        { label: "default-template", href: `${adminHref(lang, "project-start")}/default-template` },
        { label: "step-8" },
      ]}
      title={x.pageTitle}
      hint={x.pageHint}
    >
      <StepSection
        index={8}
        total={DEFAULT_TEMPLATE_TOTAL}
        stepOfTemplate={x.stepOf}
        doneLabel={x.done}
        done={marked}
        badge={x.badge}
        title={x.title}
        lead={x.lead}
        // Голубая — чем локальный просмотр отличается от того, что видят люди.
        info={localVsPublic(lang, site.url)}
        important={x.important}
        actionLead={x.actionLead}
        bullets={x.bullets}
        stepHref={(n) =>
          n <= DEFAULT_TEMPLATE_BUILT
            ? `${adminHref(lang, "project-start")}/default-template/step-${n}`
            : undefined
        }
      >
        {/* 🔒 ОСТРОВКАМ — ТОЛЬКО ИХ СЛОВА, ПЕРЕЧИСЛЕННЫЕ ПОИМЁННО. Тип не сужает
            рантайм: объект целиком уехал бы по проводу со всем, что окажется в
            нём завтра. ✗ оплачено дважды за шаг 25. */}
        <div className="flex flex-col gap-4">
          <StepGrabButton
            href="/api/config/env-export"
            label={x.grabLabel}
            toastTitle={x.grabToastTitle}
            toastBody={x.grabToastBody}
            failureTitle={x.grabFailure}
          />

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
            <StepNav
              prevHref={`${adminHref(lang, "project-start")}/default-template/step-7`}
              nextHref={
                DEFAULT_TEMPLATE_BUILT >= 9
                  ? `${adminHref(lang, "project-start")}/default-template/step-9`
                  : undefined
              }
              labels={{ goPrev: x.goPrev, goNext: x.goNext }}
            />
          ) : (
            <StepCheck
              index={8}
              total={DEFAULT_TEMPLATE_TOTAL}
              mark="local-run"
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
