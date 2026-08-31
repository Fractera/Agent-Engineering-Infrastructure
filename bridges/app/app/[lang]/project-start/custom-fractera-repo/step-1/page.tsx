// ШАГ ПЕРВЫЙ ВТОРОГО ПУТИ: АДРЕС ПРОЕКТА-ДОНОРА (35-1, 2026-08-31).
//
// 🔒 АСИММЕТРИЯ ПУТЕЙ НАЧИНАЕТСЯ ПРЯМО ЗДЕСЬ. У первого пути первый шаг спрашивает
// адрес СВОЕГО пустого репозитория — человек будет туда отправлять. Здесь он
// называет ЧУЖОЙ проект, из которого приедет код. Поля похожи, смысл
// противоположный, и потому ключ состояния свой: `donor-url`, а не `repo-url`.
// ✗ Общий ключ дал бы прошедшему первый путь загоревшийся шаг второго — то есть
// поздравление с тем, чего он не делал (оплачено шагом 25).
//
// 🔒 ЗАЩИТЫ ОТ ПРЫЖКА ЗДЕСЬ ПОКА НЕТ, И ЭТО НЕ ЗАБЫТО. Она читает перечисление
// шагов пути (`_steps.ts`), которого у второго пути ещё не существует: построен
// один шаг, и прыгать некуда. Перечисление и защита придут в 35-6 вместе с
// остальными шагами. Написать защиту раньше шагов значило бы сторожить пустоту.
//
// 🔒 АНАТОМИЯ ШАГА — ОБЩАЯ, ВЗЯТАЯ, А НЕ НАПИСАННАЯ ЗАНОВО. `StepSection` и
// `StepForm` те же, что у первого пути: порядок «бейдж → заголовок → лид →
// подсказки → действие» переставить снаружи нельзя, а любую часть можно не дать.
// ✗ Две секции, написанные по отдельности, разъезжаются — замер, оплаченный
// дважды (28-2 и 28-20).

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../../../_components/page-shell";
import { StepLocked } from "../../../_components/launch/step-locked";
import { adoptLockedFor } from "../_steps";
import { StepSection } from "../../../_components/launch/step-section";
import { StepForm } from "../../../_components/launch/step-form.client";
import { flowDone, flowShown } from "@/lib/launch-flow";
import { ADOPT_PATH_TOTAL, adoptStepBuilt, adoptStepOneStrings, adoptPickerStrings } from "../_strings";
import { DONOR_EXAMPLES, exampleNote, forkHref } from "../_examples";

export const dynamic = "force-dynamic";

export default async function CustomFracteraRepoStepOne(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = adoptStepOneStrings(lang);
  const pick = adoptPickerStrings(lang);

  // 🔒 ЯЗЫК ВЫБИРАЕТСЯ ЗДЕСЬ, НА СЕРВЕРЕ, А В ОСТРОВОК УЕЗЖАЮТ ГОТОВЫЕ СТРОКИ.
  // Отдать islands объект с языками значило бы увезти в браузер словарь — тот же
  // закон, по которому словарь панели серверный.
  const picks = DONOR_EXAMPLES.map((e) => ({
    url: e.url,
    name: e.name,
    note: exampleNote(e, lang),
    // Адрес кнопки Fork считается у источника, а не собирается в разметке.
    forkHref: forkHref(e),
  }));

  // 🔒 ЗАЩИТА ОТ ПРЫЖКА ВПЕРЁД (35-6). Открыт шаг, у которого закрыты все
  // предыдущие; пройденный остаётся открытым — вернуться человек вправе (28-18).
  // Заголовок показывается и у запертого: страница без заголовка читается как
  // поломка, а не как «рано» (решение владельца, 28-13).
  const locked = adoptLockedFor(lang, 1);
  if (locked) {
    return (
      <PageShell
        lang={lang}
        slug="project-start"
        s={s}
        tail={[
          { label: "custom-fractera-repo", href: `${adminHref(lang, "project-start")}/custom-fractera-repo` },
          { label: "step-1" },
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
      // Хвост крошек — ссылками: путь показывает уровень, на который можно
      // вернуться (28-15).
      tail={[
        { label: "custom-fractera-repo", href: `${adminHref(lang, "project-start")}/custom-fractera-repo` },
        { label: "step-1" },
      ]}
      title={x.pageTitle}
      hint={x.pageHint}
    >
      <StepSection
        index={1}
        total={ADOPT_PATH_TOTAL}
        stepOfTemplate={x.stepOf}
        doneLabel={x.done}
        // Отметка рисуется от СОХРАНЁННОГО факта, а не от того, что человек
        // побывал на странице.
        done={flowDone("fork-url")}
        badge={x.badge}
        title={x.title}
        lead={x.lead}
        info={x.info}
        important={x.important}
        actionLead={x.actionLead}
        bullets={x.bullets}
        // Шкала кликабельна только по ПОСТРОЕННЫМ шагам: ссылка на несуществующий
        // ведёт в 404 (оплачено 28-11).
        stepHref={(n) =>
          adoptStepBuilt(n)
            ? `${adminHref(lang, "project-start")}/custom-fractera-repo/step-${n}`
            : undefined
        }
      >
        {/* Островку — только его слова, перечисленные поимённо: тип не сужает
            рантайм, и объект целиком уехал бы по проводу со всем, что окажется в
            нём завтра. */}
        <StepForm
          index={1}
          total={ADOPT_PATH_TOTAL}
          flowStep="fork-url"
          saved={flowShown("fork-url")}
          // ✗ 🔒 ЭТОГО ЗДЕСЬ НЕ БЫЛО, И ДЫРА БЫЛА ХУЖЕ ОТСУТСТВИЯ КНОПОК (35-10).
          // `StepForm` на закрытом шаге показывает навигацию ВМЕСТО кнопки
          // сохранения, а `StepNav` без единого адреса возвращает `null`. Человек,
          // сохранивший адрес донора, видел внизу ПУСТОТУ: кнопки уже нет,
          // навигации ещё нет, и дорога дальше оставалась только через шкалу
          // вверху — то есть там, куда не смотрят.
          //
          // 🔒 `prevHref` НЕ ПЕРЕДАЁТСЯ НАМЕРЕННО: шаг первый, назад идти некуда.
          // Три положения навигации выводятся из наличия адресов, а не из
          // отдельного признака (28-20).
          nextHref={adoptStepBuilt(2) ? `${adminHref(lang, "project-start")}/custom-fractera-repo/step-2` : undefined}
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
            goPrev: x.goPrev,
            goNext: x.goNext,
            replace: x.replace,
          }}
          // 🔒 ЭТОГО НЕТ У ПЕРВОГО ПУТИ, И ЭТО НЕ УПУЩЕНИЕ. Там человек называет
          // СВОЙ пустой репозиторий — советовать ему чужой адрес бессмысленно.
          picks={picks}
          pickLabels={pick}
        />
      </StepSection>
    </PageShell>
  );
}
