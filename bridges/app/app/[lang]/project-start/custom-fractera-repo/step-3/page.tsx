// ШАГ ТРЕТИЙ ВТОРОГО ПУТИ: ПРОЕКТ ОТКРЫВАЕТСЯ ПО ВАШЕМУ АДРЕСУ (35-4).
//
// 🔒 ТРЕТИЙ РОД ДЕЙСТВИЯ — ОТМЕТКА ЧЕЛОВЕКА, И ЗДЕСЬ ОН ЕДИНСТВЕННО ВОЗМОЖЕН.
// Форма сохраняет введённое — вводить нечего. Кнопка проверки спрашивает сервер —
// сервер и так знает, что сборка прошла, но не знает главного: увидел ли человек
// то, за чем пришёл. Страница могла открыться пустой, чужой, не на том языке.
// Глаз на его браузере у панели нет, и делать вид, что есть, — ложь.
//
// 🔒 ОТМЕТКА СВОЯ (`adopt-live-seen`), ЗАИМСТВОВАНИЕ ЗАПРЕЩЕНО. Ближайшая чужая —
// `deployed-seen` десятого шага первого пути, и вопрос там звучит почти так же.
// Но там человек развернул СВОИ правки со своей машины, здесь он смотрит на
// чужой проект, ставший его. Общая отметка зажигала бы этот шаг всем, кто прошёл
// первый путь.
//
// 🔒 ССЫЛКА ПОЯВЛЯЕТСЯ, ТОЛЬКО ЕСЛИ СЕРВЕР ЗНАЕТ СВОЙ АДРЕС. Не знает — вместо
// ссылки сказано словами, чего не хватает и куда идти. Ссылка в никуда хуже её
// отсутствия (✗ оплачено шагом 34), а пустая ссылка ещё и выглядит поломкой.
//
// 🔒 ИЛЛЮСТРАЦИИ НЕТ, И ЭТО НЕ ЗАБЫВЧИВОСТЬ. Экран этого шага у каждого свой —
// это чужой проект, который человек выбрал сам. Нарисовать образец значило бы
// показать выдумку как то, что он должен увидеть.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../../../_components/page-shell";
import { StepLocked } from "../../../_components/launch/step-locked";
import { adoptLockedFor } from "../_steps";
import { StepSection } from "../../../_components/launch/step-section";
import { StepCheck } from "../../../_components/launch/step-check.client";
import { StepNav } from "../../../_components/launch/step-nav";
import { Callout } from "../../../_components/launch/callout";
import { flowMarked } from "@/lib/launch-flow";
import { publicSiteUrl } from "@/lib/public-site-url";
import { ADOPT_PATH_TOTAL, adoptStepBuilt } from "../_strings";
import { adoptStepThreeStrings, whatYourAddressMeans } from "../_step3";

export const dynamic = "force-dynamic";

export default async function CustomFracteraRepoStepThree(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = adoptStepThreeStrings(lang);
  const base = `${adminHref(lang, "project-start")}/custom-fractera-repo`;

  const marked = flowMarked("adopt-live-seen");
  const site = publicSiteUrl();

  // 🔒 ЗАЩИТА ОТ ПРЫЖКА ВПЕРЁД (35-6). Открыт шаг, у которого закрыты все
  // предыдущие; пройденный остаётся открытым — вернуться человек вправе (28-18).
  // Заголовок показывается и у запертого: страница без заголовка читается как
  // поломка, а не как «рано» (решение владельца, 28-13).
  const locked = adoptLockedFor(lang, 3);
  if (locked) {
    return (
      <PageShell
        lang={lang}
        slug="project-start"
        s={s}
        tail={[
          { label: "custom-fractera-repo", href: `${adminHref(lang, "project-start")}/custom-fractera-repo` },
          { label: "step-3" },
        ]}
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

  return (
    <PageShell
      lang={lang}
      slug="project-start"
      s={s}
      tail={[
        { label: "custom-fractera-repo", href: base },
        { label: "step-3" },
      ]}
      title={x.pageTitle}
      hint={x.pageHint}
    >
      <StepSection
        index={3}
        total={ADOPT_PATH_TOTAL}
        stepOfTemplate={x.stepOf}
        doneLabel={x.done}
        done={marked}
        badge={x.badge}
        title={x.title}
        lead={x.lead}
        // Голубая: чей это адрес и почему прежний владелец к нему отношения не имеет.
        info={whatYourAddressMeans(lang, site.url)}
        important={x.important}
        actionLead={x.actionLead}
        bullets={x.bullets}
        link={site.url ? { href: site.url, label: x.linkLabel } : undefined}
        stepHref={(n) => (adoptStepBuilt(n) ? `${base}/step-${n}` : undefined)}
      >
        <div className="flex flex-col gap-4">
          {/* Сервер своего адреса не знает — говорим это словами на месте
              действия, а не молчим: молчание человек читает как «шаг сломан». */}
          {!site.url && <Callout tone="info">{x.noAddress}</Callout>}

          {marked ? (
            <StepNav
              prevHref={`${base}/step-2`}
              nextHref={adoptStepBuilt(4) ? `${base}/step-4` : undefined}
              labels={{ goPrev: x.goPrev, goNext: x.goNext }}
            />
          ) : (
            /* 🔒 Островку — только его слова, перечисленные поимённо. */
            <StepCheck
              index={3}
              total={ADOPT_PATH_TOTAL}
              mark="adopt-live-seen"
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
