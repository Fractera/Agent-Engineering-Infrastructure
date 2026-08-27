// ШАГ ПЕРВЫЙ ПУТИ «СТАРТОВЫЙ ШАБЛОН»: ПОДКЛЮЧЕНИЕ РЕПОЗИТОРИЯ (28-9, 2026-08-27).
//
// 🔒 ОДИН ШАГ — ОДНО ДЕЙСТВИЕ, И ЭТО ВЕСЬ СМЫСЛ СТРАНИЦЫ. Владелец: «этот шаг
// посвящается одному единственному действию — подключению репозитория». Живой
// мастер сегодня в «шаге 1 из 13» требует четырёх: адрес, токен, проверка,
// отправка. Здесь — только адрес; токен, проверка и отправка станут шагами 2, 3
// и 4. На этой странице второе действие поставить некуда: у секции одно место под
// действие, и у формы одно поле.
//
// 🔒 ШАГ ПОДТВЕРЖДАЕТСЯ ТОСТОМ — стандарт, принятый на образце: «Вы завершили шаг
// {n} из {total}» плюс обещание перехода; тост живёт пять секунд, переход — через
// три, чтобы поздравление пережило смену страницы.
//
// 🔒 ЧЕГО СТРАНИЦА ПОКА НЕ ДЕЛАЕТ, И ЭТО СКАЗАНО ВСЛУХ: она не записывает адрес
// на сервер. Настоящее сохранение пишет `USER_LAUNCH_*` в `.env.local` слота и
// двигает состояние ЖИВОГО мастера — того, который владелец запретил трогать до
// отдельного слова. Место для вызова двери отмечено в `step-form.client.tsx`.
//
// 🔒 КРОШКИ НЕ ЗАВОДЯТ НОВЫЙ SLUG. Раздел один — `project-start`; шаг это место
// ВНУТРИ него, и путь показывает его хвостом. Заводить slug на каждый шаг значит
// положить шестнадцать пунктов в меню панели.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../../../_components/page-shell";
import { StepSection } from "../../../_components/launch/step-section";
import { StepForm } from "../../../_components/launch/step-form.client";
import { flowShown, flowDone } from "@/lib/launch-flow";
import { stepOneStrings, DEFAULT_TEMPLATE_TOTAL, DEFAULT_TEMPLATE_BUILT } from "../_strings";

export const dynamic = "force-dynamic";

export default async function DefaultTemplateStepOne(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = stepOneStrings(lang);

  return (
    <PageShell
      lang={lang}
      slug="project-start"
      s={s}
      // 🔒 ХВОСТ КРОШЕК — ССЫЛКАМИ (28-15). Здесь стоял `params`, и хвост
      // рисовался текстом: путь показывал уровень, на который нельзя вернуться.
      // Владелец: «некоторые элементы крошек работают, а некоторые нет».
      tail={[
        { label: "default-template", href: `${adminHref(lang, "project-start")}/default-template` },
        { label: "step-1" },
      ]}
      title={x.pageTitle}
      hint={x.pageHint}
    >
      <StepSection
        index={1}
        total={DEFAULT_TEMPLATE_TOTAL}
        stepOfTemplate={x.stepOf}
        doneLabel={x.done}
        // 🔒 Зелёный круг и словесная отметка рисуются ОТ СОХРАНЁННОГО ФАКТА, а
        // не от того, что человек побывал на странице. Иначе шаг поздравлял бы с
        // тем, чего не случилось, — дефект, оплаченный в шаге 25.
        done={flowDone("repo-url")}
        badge={x.badge}
        title={x.title}
        lead={x.lead}
        info={x.info}
        important={x.important}
        actionLead={x.actionLead}
        bullets={x.bullets}
        // 🔒 ШКАЛА КЛИКАБЕЛЬНА (28-15): прыжок вперёд-назад одним нажатием на
        // отрезок. Адреса шагов знает ПУТЬ, а не анатомия шага.
        stepHref={(n) =>
          n <= DEFAULT_TEMPLATE_BUILT
            ? `${adminHref(lang, "project-start")}/default-template/step-${n}`
            : undefined
        }
        // 🔒 СНИМОК ЧУЖОГО ЭКРАНА — прислан владельцем 2026-08-27 для этого шага.
        // Форма создания репозитория: где имя, где владелец, где видимость.
        shot={
          x.shotAlt && x.shotCaption
            ? {
                src: "/images/launch/step-1-new-repository.png",
                alt: x.shotAlt,
                caption: x.shotCaption,
              }
            : undefined
        }
        // 🔒 ССЫЛКА-ДЕЙСТВИЕ: КУДА идти заводить репозиторий. `github.com/new`
        // открывает форму создания сразу — это её обычный адрес, а не наш
        // придуманный маршрут.
        link={{ href: "https://github.com/new", label: x.linkLabel }}
      >
        {/* 🔒 Островку — только его слова, перечисленные поимённо: тип не сужает
            рантайм, и объект целиком уехал бы по проводу со всем, что окажется в
            нём завтра. ✗ оплачено дважды за шаг 25. */}
        <StepForm
          index={1}
          total={DEFAULT_TEMPLATE_TOTAL}
          // 🔒 ТЕПЕРЬ ШАГ СОХРАНЯЕТ (28-17). Ключ — свой, `USER_FLOW_REPO_URL`;
          // состояние живого мастера не задето ни одним байтом.
          flowStep="repo-url"
          saved={flowShown("repo-url")}
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
          }}
          // 🔒 ПЕРЕХОД ВЕРНУЛСЯ ВМЕСТЕ С ШАГОМ 2 (28-10). Несколькими часами
          // раньше здесь стоял адрес шага, которого не существовало: тост обещал
          // переход, а человек попадал в 404 — названная, но не обеспеченная
          // возможность. Теперь маршрут есть, и обещание в тосте снова честное.
          nextHref={`${adminHref(lang, "project-start")}/default-template/step-2`}
        />
      </StepSection>
    </PageShell>
  );
}
