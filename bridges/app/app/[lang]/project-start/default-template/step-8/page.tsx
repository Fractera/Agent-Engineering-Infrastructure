// ШАГ ВОСЬМОЙ: УСТАНОВКА ЗАВИСИМОСТЕЙ (28-29, 2026-08-28).
//
// 🔒 ШАГ РАЗРЕЗАН НАДВОЕ РЕШЕНИЕМ ВЛАДЕЛЬЦА 2026-08-28: «мы должны разделить этот
// шаг на два дела… это прохождение установки NPM зависимости». Здесь остаётся
// приезд проекта и привоз материалов; запуск, слово `localhost:3000` и галочка «я
// вижу такой же проект» уезжают в шаг девятый (28-30).
//
// 🔒 ЗДЕСЬ ПО-ПРЕЖНЕМУ СХЛОПНУТА ВЕРЕНИЦА ПРЕЖНИХ ШАГОВ, и это решение владельца, а
// не упрощение по дороге: раньше человек вставлял репозиторий, разворачивал проект,
// потом шёл за ключами в соседнюю вкладку. Сегодня `api/config/env-export` отдаёт
// одним файлом всё — адрес слоя данных, ключи, доступ к серверу и переменные
// слота вместе с адресом репозитория. Значит вкладок больше не нужно.
//
// 🔒 ГОЛУБАЯ ПОДСКАЗКА ЗДЕСЬ ОБЪЯСНЯЕТ ПРИЧИНУ, А НЕ АДРЕС. Прежняя — про разницу
// локального и опубликованного — с этой страницы снята вместе с запуском:
// объяснять разницу с опубликованным адресом нечему, пока проект не поднят.
// Поэтому `publicSiteUrl()` отсюда ушёл, и вернётся он на девятом шаге, где живой
// адрес действительно нужен.
//
// 🔒 ДЕЙСТВИЕ ШАГА ОДНО — ГАЛОЧКА. Кнопка выдачи, блок подсказки и снимок
// действиями шага не являются: они дают материал, а закрывает шаг человек,
// дождавшийся конца установки. Панель этого увидеть не может — у неё нет глаз на
// его машине.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../../../_components/page-shell";
import { StepSection } from "../../../_components/launch/step-section";
import { StepCheck } from "../../../_components/launch/step-check.client";
import { StepNav } from "../../../_components/launch/step-nav";
import { StepGrabButton, StepCopyBlock } from "../../../_components/launch/step-grab.client";
import { Small } from "@/components/ui/typography";
import { flowMarked } from "@/lib/launch-flow";
import { DEFAULT_TEMPLATE_TOTAL, DEFAULT_TEMPLATE_BUILT } from "../_strings";
import { stepEightStrings } from "../_step8";

export const dynamic = "force-dynamic";

export default async function DefaultTemplateStepEight(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = stepEightStrings(lang);
  // 🔒 ОТМЕТКА ОСТАЁТСЯ `local-run` И ПЕРЕИМЕНОВАНИЮ НЕ ПОДЛЕЖИТ: у тех, кто уже
  // прошёл прежний восьмой шаг, она проставлена в окружении слота, и смена имени
  // погасила бы пройденное. Девятому шагу даётся СВОЯ отметка (28-30).
  const marked = flowMarked("local-run");

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
        // Голубая — почему проект нельзя открыть сразу и что такое зависимости.
        info={x.info}
        important={x.important}
        actionLead={x.actionLead}
        bullets={x.bullets}
        shot={{
          src: "/images/launch/step-8-install-deps.png",
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
