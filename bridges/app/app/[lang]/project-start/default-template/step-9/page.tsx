// ШАГ ДЕВЯТЫЙ: ПРОЕКТ ЗАПУЩЕН И ВИДЕН НА LOCALHOST:3000 (28-30, 2026-08-28).
//
// 🔒 ЭТОТ ШАГ РОДИЛСЯ ИЗ РАЗРЕЗА ВОСЬМОГО, а не добавился сверх плана. Владелец
// 2026-08-28: «Я ошибочно в прошлый раз попросил тебя два шага провести в одном».
// Восьмой довозит материалы, девятый показывает дом.
//
// 🔒 ОТМЕТКА СВОЯ — `project-seen`, И ЗАИМСТВОВАТЬ ЧУЖУЮ ЗАПРЕЩЕНО. Восьмой шаг
// держит `local-run`, и если бы девятый читал её же, он загорался бы зелёным у
// всех, кто прошёл прежний объединённый шаг, — то есть поздравлял бы человека с
// тем, чего он не делал. ✗ ровно этим оплачен шаг 25.
//
// 🔒 ЗАКРЫВАЕТ ЧЕЛОВЕК, И ОТМЕТКА СНИМАЕМАЯ. У панели нет глаз на его машине:
// она не видит ни браузера, ни поднятого порта. Делать вид, что видит, — ложь,
// а одноразовая отметка говорила бы «когда-то стояло» после того, как проект
// давно остановлен.
//
// 🔒 ГОЛУБАЯ ПОДСКАЗКА ЗНАЕТ РЕЖИМ СЕРВЕРА, А НЕ УГАДЫВАЕТ ЕГО. `publicSiteUrl()`
// спрашивает окружение (защищённый режим) и базу (имя домена) и отдаёт либо
// `https://домен`, либо `http://IP:3000`. Написать «ваш домен» вообще значило бы
// заставить человека гадать, о чём речь.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../../../_components/page-shell";
import { StepSection } from "../../../_components/launch/step-section";
import { StepCheck } from "../../../_components/launch/step-check.client";
import { StepNav } from "../../../_components/launch/step-nav";
import { StepCopyBlock } from "../../../_components/launch/step-grab.client";
import { Small } from "@/components/ui/typography";
import { flowMarked } from "@/lib/launch-flow";
import { publicSiteUrl } from "@/lib/public-site-url";
import { DEFAULT_TEMPLATE_TOTAL, DEFAULT_TEMPLATE_BUILT } from "../_strings";
import { stepNineStrings, localVsPublic } from "../_step9";

export const dynamic = "force-dynamic";

export default async function DefaultTemplateStepNine(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = stepNineStrings(lang);
  const marked = flowMarked("project-seen");
  const site = publicSiteUrl();

  return (
    <PageShell
      lang={lang}
      slug="project-start"
      s={s}
      tail={[
        { label: "default-template", href: `${adminHref(lang, "project-start")}/default-template` },
        { label: "step-9" },
      ]}
      title={x.pageTitle}
      hint={x.pageHint}
    >
      <StepSection
        index={9}
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
        shot={{
          src: "/images/launch/step-9-localhost-running.png",
          alt: x.shotAlt,
          caption: x.shotCaption,
        }}
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
              prevHref={`${adminHref(lang, "project-start")}/default-template/step-8`}
              nextHref={
                DEFAULT_TEMPLATE_BUILT >= 10
                  ? `${adminHref(lang, "project-start")}/default-template/step-10`
                  : undefined
              }
              labels={{ goPrev: x.goPrev, goNext: x.goNext }}
            />
          ) : (
            <StepCheck
              index={9}
              total={DEFAULT_TEMPLATE_TOTAL}
              mark="project-seen"
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
