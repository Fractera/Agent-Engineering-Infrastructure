// ШАГ ДЕСЯТЫЙ: ПЕРВОЕ ИЗМЕНЕНИЕ И РАЗВЁРТЫВАНИЕ В ИНТЕРНЕТ (28-31, 2026-08-29).
//
// 🔒 ЭТО ПОСЛЕДНИЙ РАБОЧИЙ ШАГ ПУТИ, и потому он единственный, где человек
// впервые видит СВОЙ проект глазами постороннего. Всё, что было до него,
// происходило на его машине; здесь работа выходит наружу.
//
// 🔒 ОТМЕТКА СВОЯ — `deployed-seen`, И ЗАИМСТВОВАТЬ ЧУЖУЮ ЗАПРЕЩЕНО. Девятый шаг
// держит `project-seen` — «вижу проект на своей машине». Здесь вопрос другой:
// «вижу свой проект в интернете». Одна отметка на два вопроса зажигала бы этот
// шаг у всех, кто прошёл девятый, — то есть поздравляла бы человека с
// развёртыванием, которого он не делал. ✗ ровно этим оплачен шаг 25.
//
// 🔒 ЗАКРЫВАЕТ ЧЕЛОВЕК, И ОТМЕТКА СНИМАЕМАЯ. Панель не видит ни его машины, ни
// его браузера; спросить у сервера «а его ли это сборка» она тоже не может —
// сборку запускает агент с чужой машины. Делать вид, что видит, — ложь.
//
// 🔒 ИЛЛЮСТРАЦИИ ЗДЕСЬ НЕТ, И ЭТО НЕ ЗАБЫВЧИВОСТЬ. Снимки предыдущих шагов
// присылал владелец — это были экраны, которые уже кто-то видел. Экрана этого
// шага не существует ни у кого: он рождается у первого человека, прошедшего
// путь. Нарисовать его самому значило бы показать чужую выдумку как образец
// того, что он должен увидеть. Сущность просто не даётся — пустого контейнера
// секция не рисует.
//
// 🔒 ССЫЛКА-ДЕЙСТВИЕ ВЕДЁТ НА ЕГО СОБСТВЕННЫЙ АДРЕС, а не на чужой сервис, и
// появляется, только если сервер этот адрес знает. Ссылка в никуда хуже её
// отсутствия — этим оплачен шаг 34.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../../../_components/page-shell";
import { StepSection } from "../../../_components/launch/step-section";
import { pathSteps, stepOpen, currentStep } from "../_steps";
import { pathMapStrings } from "../_strings";
import { StepLocked } from "../../../_components/launch/step-locked";
import { StepCheck } from "../../../_components/launch/step-check.client";
import { StepNav } from "../../../_components/launch/step-nav";
import { StepCopyBlock } from "../../../_components/launch/step-grab.client";
import { Small } from "@/components/ui/typography";
import { flowMarked } from "@/lib/launch-flow";
import { publicSiteUrl } from "@/lib/public-site-url";
import { DEFAULT_TEMPLATE_TOTAL, DEFAULT_TEMPLATE_BUILT } from "../_strings";
import { stepTenStrings, whatDeployMeans } from "../_step10";

export const dynamic = "force-dynamic";

export default async function DefaultTemplateStepTen(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = stepTenStrings(lang);

  // 🔒 ЗАЩИТА ОТ ПРЫЖКА ВПЕРЁД (28-13). Открыт шаг, у которого закрыты все
  // предыдущие. Пройденный шаг остаётся открытым: вернуться и заменить значение
  // человек вправе (28-18), и запертая дорога назад превратила бы путь в допрос.
  const flowSteps = pathSteps(lang);
  if (!stepOpen(flowSteps, 10)) {
    const back = currentStep(flowSteps);
    const m = pathMapStrings(lang);
    const backN = back ? back.n : 1;
    return (
      <PageShell
        lang={lang}
        slug="project-start"
        s={s}
        tail={[
          { label: "default-template", href: `${adminHref(lang, "project-start")}/default-template` },
          { label: "step-10" },
        ]}
        title={x.pageTitle}
        hint={x.pageHint}
      >
        <StepLocked
          title={x.title}
          message={m.lockedMessage.replace("{n}", String(backN))}
          backHref={`${adminHref(lang, "project-start")}/default-template/step-${backN}`}
          backLabel={m.lockedBack.replace("{n}", String(backN))}
        />
      </PageShell>
    );
  }
  const marked = flowMarked("deployed-seen");
  const site = publicSiteUrl();

  return (
    <PageShell
      lang={lang}
      slug="project-start"
      s={s}
      tail={[
        { label: "default-template", href: `${adminHref(lang, "project-start")}/default-template` },
        { label: "step-10" },
      ]}
      title={x.pageTitle}
      hint={x.pageHint}
    >
      <StepSection
        index={10}
        total={DEFAULT_TEMPLATE_TOTAL}
        stepOfTemplate={x.stepOf}
        doneLabel={x.done}
        done={marked}
        badge={x.badge}
        title={x.title}
        lead={x.lead}
        // Голубая — что такое развёртывание и какая фраза его запускает.
        info={whatDeployMeans(lang, site.url)}
        important={x.important}
        danger={x.danger}
        actionLead={x.actionLead}
        bullets={x.bullets}
        link={site.url ? { href: site.url, label: x.linkLabel } : undefined}
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
              prevHref={`${adminHref(lang, "project-start")}/default-template/step-9`}
              nextHref={
                DEFAULT_TEMPLATE_BUILT >= 11
                  ? `${adminHref(lang, "project-start")}/default-template/step-11`
                  : undefined
              }
              labels={{ goPrev: x.goPrev, goNext: x.goNext }}
            />
          ) : (
            <StepCheck
              index={10}
              total={DEFAULT_TEMPLATE_TOTAL}
              mark="deployed-seen"
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
