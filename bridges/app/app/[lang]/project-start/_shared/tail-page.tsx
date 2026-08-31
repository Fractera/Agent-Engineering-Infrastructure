import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../../_components/page-shell";
import { StepSection } from "../../_components/launch/step-section";
import { StepCheck } from "../../_components/launch/step-check.client";
import { StepNav } from "../../_components/launch/step-nav";
import { StepLocked } from "../../_components/launch/step-locked";
import { StepGrabButton, StepCopyBlock } from "../../_components/launch/step-grab.client";
import { Small } from "@/components/ui/typography";
import { flowMarked } from "@/lib/launch-flow";
import { publicSiteUrl } from "@/lib/public-site-url";
import { TAIL_STEPS } from "./tail-steps";

// СТРАНИЦА ОБЩЕГО ШАГА — ОДНА НА ОБА ПУТИ (35-5, 2026-08-31).
//
// 🔒 ЭТО ЕДИНСТВЕННОЕ МЕСТО В ШАГЕ 35, КОТОРОЕ ТРОГАЕТ РАБОТАЮЩИЙ ПУТЬ 1, и
// потому оно устроено переездом, а не переписыванием: тело собрано из страниц
// `default-template/step-5…step-9`, которые до сегодня были пятью почти
// одинаковыми файлами. Отличались они ровно тем, что теперь приходит
// параметрами: номер, отметка, снимок, ссылка, кнопка выдачи окружения, блок
// подсказки.
//
// 🔒 НОМЕР ПРИХОДИТ ПАРАМЕТРОМ, А НЕ ЖИВЁТ В СЛОВАХ. У первого пути общий хвост
// — шаги 5–9, у второго 8–12. Зашитый номер сделал бы файл непереиспользуемым
// ровно там, где он заводится ради переиспользования.
//
// 🔒 ЗАЩИТУ ОТ ПРЫЖКА СЧИТАЕТ ПУТЬ, А НЕ ЭТОТ ФАЙЛ. Она читает перечисление
// шагов ПУТИ — своё у каждого, и у второго его ещё нет (придёт в 35-6). Путь
// передаёт сюда готовое решение: заперт или открыт, и куда возвращаться. Внести
// сюда `pathSteps()` первого пути значило бы, что общий файл знает про один из
// путей больше, чем про другой.
//
// 🔒 ОБЕ ВЕТКИ НАБЛЮДАЕМЫ, И ЭТО НЕ СОВПАДЕНИЕ, А ЕДИНСТВЕННЫЙ ДОСТУПНЫЙ СПОСОБ
// ПРОВЕРКИ. Путь 1 на тест-сервере не начат — его шаги 3 и 4 закрываются
// настоящим ответом GitHub, и открыть их замером нельзя. Значит запертую ветку
// показывает путь 1, открытую — путь 2, и обе идут через ЭТОТ файл.

export type TailLocked = {
  /** Что сказать человеку, забредшему вперёд. */
  message: string;
  backHref: string;
  backLabel: string;
};

export type TailPathConfig = {
  /** Папка пути: `default-template` или `custom-fractera-repo`. */
  slug: string;
  /** Корень пути с языком: `${adminHref(lang,'project-start')}/${slug}`. */
  base: string;
  /** Сколько шагов у пути ЗАДУМАНО — знаменатель шкалы. */
  total: number;
  /** Построен ли шаг под этим номером: шкала делает ссылками только такие. */
  isBuilt: (n: number) => boolean;
  /** Решение пути о запрете. `null` — шаг открыт. */
  locked: TailLocked | null;
};

export async function TailStepPage({
  lang,
  index,
  tailIndex,
  path,
}: {
  lang: string;
  /** Номер шага НА ЭТОМ пути. */
  index: number;
  /** Который из пяти общих шагов, от нуля. */
  tailIndex: number;
  path: TailPathConfig;
}) {
  const s = getAdminStrings(lang);
  const step = TAIL_STEPS[tailIndex];
  const x = step.strings(lang);

  const tail = [
    { label: path.slug, href: path.base },
    { label: `step-${index}` },
  ];

  if (path.locked) {
    return (
      <PageShell lang={lang} slug="project-start" s={s} tail={tail} title={x.pageTitle} hint={x.pageHint}>
        <StepLocked
          title={x.title}
          message={path.locked.message}
          backHref={path.locked.backHref}
          backLabel={path.locked.backLabel}
        />
      </PageShell>
    );
  }

  const marked = flowMarked(step.mark);

  // Живой адрес нужен единственному шагу из пяти — тому, где объясняется разница
  // между «вижу у себя» и «видят люди». Остальным он не передаётся вовсе.
  const info = step.infoFromSite ? step.infoFromSite(lang, publicSiteUrl().url) : x.info;

  return (
    <PageShell lang={lang} slug="project-start" s={s} tail={tail} title={x.pageTitle} hint={x.pageHint}>
      <StepSection
        index={index}
        total={path.total}
        stepOfTemplate={x.stepOf}
        doneLabel={x.done}
        done={marked}
        badge={x.badge}
        title={x.title}
        lead={x.lead}
        info={info}
        important={x.important}
        danger={x.danger}
        actionLead={x.actionLead}
        bullets={x.bullets}
        shot={
          step.shot && x.shotAlt && x.shotCaption
            ? { src: step.shot.src, alt: x.shotAlt, caption: x.shotCaption }
            : undefined
        }
        link={step.linkHref && x.linkLabel ? { href: step.linkHref, label: x.linkLabel } : undefined}
        stepHref={(n) => (path.isBuilt(n) ? `${path.base}/step-${n}` : undefined)}
      >
        {/* 🔒 ОСТРОВКАМ — ТОЛЬКО ИХ СЛОВА, ПЕРЕЧИСЛЕННЫЕ ПОИМЁННО. Тип не сужает
            рантайм: объект целиком уехал бы по проводу со всем, что окажется в
            нём завтра. ✗ оплачено дважды за шаг 25. */}
        <div className="flex flex-col gap-4">
          {step.grabHref && x.grabLabel && (
            <StepGrabButton
              href={step.grabHref}
              label={x.grabLabel}
              toastTitle={x.grabToastTitle ?? ""}
              toastBody={x.grabToastBody ?? ""}
              failureTitle={x.grabFailure ?? ""}
            />
          )}

          {step.hasPrompt && x.promptText && (
            <div className="flex flex-col gap-2">
              <Small className="text-[var(--muted-foreground)]">{x.promptLead}</Small>
              <StepCopyBlock
                text={x.promptText}
                label={x.copyLabel ?? ""}
                copiedLabel={x.copiedLabel ?? ""}
                toastTitle={x.copyToast ?? ""}
              />
            </div>
          )}

          {marked ? (
            <StepNav
              prevHref={path.isBuilt(index - 1) ? `${path.base}/step-${index - 1}` : undefined}
              nextHref={path.isBuilt(index + 1) ? `${path.base}/step-${index + 1}` : undefined}
              labels={{ goPrev: x.goPrev, goNext: x.goNext }}
            />
          ) : (
            <StepCheck
              index={index}
              total={path.total}
              mark={step.mark}
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
