// ШАГ ТРИНАДЦАТЫЙ ВТОРОГО ПУТИ: ПРИСВОЕНИЕ И РАЗВЁРТЫВАНИЕ (35-7).
//
// 🔒 ПОСЛЕДНИЙ РАБОЧИЙ ШАГ ПУТИ — как десятый у первого. Четырнадцатый будет
// прощанием. Здесь чужой проект окончательно становится своим: реквизиты
// прежнего владельца заменяются, и результат выходит в интернет.
//
// 🔒 ОТМЕТКА СВОЯ — `adopt-deployed-seen`, И ЗАИМСТВОВАТЬ `deployed-seen`
// ЗАПРЕЩЕНО. У первого пути та отметка означает «я развернул СВОИ правки со
// своей машины»; здесь — «я вижу ЧУЖОЙ проект со СВОИМИ реквизитами». Общая
// отметка зажигала бы этот шаг каждому, кто прошёл первый путь.
//
// 🔒 ОТЛИЧИЕ ОТ ТРЕТЬЕГО ШАГА ЭТОГО ЖЕ ПУТИ ТОЖЕ СОДЕРЖАТЕЛЬНО. Там человек
// смотрел, приехал ли проект вообще; здесь — стал ли он его собственным. Между
// ними лежит вся работа с репозиторием, и одна отметка на два вопроса объявила
// бы присвоение сделанным тому, кто всего лишь увидел чужую страницу.
//
// 🔒 ИЛЛЮСТРАЦИИ НЕТ: экран этого шага у каждого свой — это чужой проект,
// который человек выбрал сам. Нарисовать образец значило бы показать выдумку.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../../../_components/page-shell";
import { StepSection } from "../../../_components/launch/step-section";
import { StepLocked } from "../../../_components/launch/step-locked";
import { StepCheck } from "../../../_components/launch/step-check.client";
import { StepNav } from "../../../_components/launch/step-nav";
import { StepCopyBlock } from "../../../_components/launch/step-grab.client";
import { Callout } from "../../../_components/launch/callout";
import { Small } from "@/components/ui/typography";
import { flowMarked } from "@/lib/launch-flow";
import { publicSiteUrl } from "@/lib/public-site-url";
import { whatDeployMeans } from "../../_shared/deploy-words";
import { ADOPT_PATH_TOTAL, adoptStepBuilt, stepBadge } from "../_strings";
import { adoptLockedFor } from "../_steps";
import { adoptAssignStrings } from "../_assign";

export const dynamic = "force-dynamic";

export default async function CustomFracteraRepoStepThirteen(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = adoptAssignStrings(lang);
  const base = `${adminHref(lang, "project-start")}/custom-fractera-repo`;

  const locked = adoptLockedFor(lang, 13);
  if (locked) {
    return (
      <PageShell
        lang={lang}
        slug="project-start"
        s={s}
        tail={[{ label: "custom-fractera-repo", href: base }, { label: "step-13" }]}
        title={x.pageTitle}
        hint={x.pageHint}
      >
        <StepLocked
          title={x.title}
          message={locked.message}
          backHref={locked.backHref}
          backLabel={locked.backLabel}
        />
      </PageShell>
    );
  }

  const marked = flowMarked("adopt-deployed-seen");
  const site = publicSiteUrl();

  return (
    <PageShell
      lang={lang}
      slug="project-start"
      s={s}
      tail={[{ label: "custom-fractera-repo", href: base }, { label: "step-13" }]}
      title={x.pageTitle}
      hint={x.pageHint}
    >
      <StepSection
        index={13}
        total={ADOPT_PATH_TOTAL}
        stepOfTemplate={x.stepOf}
        doneLabel={x.done}
        done={marked}
        badge={stepBadge(lang, 13)}
        title={x.title}
        lead={x.lead}
        // Голубая — что такое развёртывание и какая фраза его запускает. Тот же
        // текст, что на десятом шаге первого пути, из общего источника.
        info={whatDeployMeans(lang, site.url)}
        important={x.important}
        // 🔒 ЕДИНСТВЕННЫЙ КРАСНЫЙ НА ЭТОМ ШАГЕ И ВТОРОЙ НА ВСЁМ ПУТИ. Цена
        // ошибки здесь настоящая: чужое имя и чужая почта в подвале вводят в
        // заблуждение посетителей, а письма уходят прежнему владельцу.
        danger={x.danger}
        actionLead={x.actionLead}
        bullets={x.bullets}
        link={site.url ? { href: site.url, label: x.linkLabel } : undefined}
        stepHref={(n) => (adoptStepBuilt(n) ? `${base}/step-${n}` : undefined)}
      >
        {/* 🔒 ОСТРОВКАМ — ТОЛЬКО ИХ СЛОВА, ПЕРЕЧИСЛЕННЫЕ ПОИМЁННО. */}
        <div className="flex flex-col gap-4">
          {!site.url && <Callout tone="info">{x.noAddress}</Callout>}

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
              prevHref={adoptStepBuilt(12) ? `${base}/step-12` : undefined}
              nextHref={adoptStepBuilt(14) ? `${base}/step-14` : undefined}
              labels={{ goPrev: x.goPrev, goNext: x.goNext }}
            />
          ) : (
            <StepCheck
              index={13}
              total={ADOPT_PATH_TOTAL}
              mark="adopt-deployed-seen"
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
