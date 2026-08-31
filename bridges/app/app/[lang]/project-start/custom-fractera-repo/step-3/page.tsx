// ШАГ ВТОРОЙ ВТОРОГО ПУТИ: ЗАМЕНА СЛОТА СОДЕРЖИМЫМ ДОНОРА (35-3, 2026-08-31).
//
// 🔒 ЭТО САМЫЙ РАЗРУШИТЕЛЬНЫЙ ШАГ ОБОИХ ПУТЕЙ, И СТРАНИЦА УСТРОЕНА ПОД ЭТО.
// Красная врезка стоит ровно одна и живёт внутри подтверждения, то есть на втором
// движении: до него ещё ничего не решено, и тревожить нечем. Закон «один цвет
// тревоги на шаг, и лучше ни одного» здесь исполняется буквально.
//
// 🔒 ТРЕТИЙ РОД ДЕЙСТВИЯ — И ЕГО ЗДЕСЬ НЕТ. Три рода: форма сохраняет введённое ·
// кнопка проверки спрашивает сервер · отметка сообщает факт, которого панель не
// видит. Замена слота — вторая: панель делает работу сама и сама же видит итог.
// Отметки человека на этом шаге быть не может в принципе.
//
// 🔒 ОТМЕТКА ШАГА РИСУЕТСЯ ОТ ФАКТА НА СЕРВЕРЕ (`flowAdopted()`), а не от того,
// что человек побывал на странице и нажал кнопку.
//
// 🔒 ЗАЩИТЫ ОТ ПРЫЖКА ЗДЕСЬ ПОКА НЕТ, как и на шаге 1: она читает перечисление
// шагов пути, которого у второго пути ещё не существует (35-6). Но донора шаг
// требует по-настоящему: без сохранённого адреса действие не рисуется вовсе, и
// вместо него сказано, куда вернуться.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../../../_components/page-shell";
import { StepLocked } from "../../../_components/launch/step-locked";
import { adoptLockedFor } from "../_steps";
import { StepSection } from "../../../_components/launch/step-section";
import { AdoptConfirm } from "../../../_components/launch/adopt-confirm.client";
import { StepNav } from "../../../_components/launch/step-nav";
import { flowAdopted, flowValue } from "@/lib/launch-flow";
import { ADOPT_PATH_TOTAL, adoptStepBuilt, stepBadge } from "../_strings";
import { adoptSwapStrings } from "../_swap";

export const dynamic = "force-dynamic";

/** Куда писать, когда сборка не прошла. Тот же адрес, что у запроса консультации. */
const SUPPORT_EMAIL = "admin@fractera.ai";

export default async function CustomFracteraRepoStepTwo(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const x = adoptSwapStrings(lang);
  const base = `${adminHref(lang, "project-start")}/custom-fractera-repo`;

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
        done={flowAdopted()}
        badge={stepBadge(lang, 3)}
        title={x.title}
        lead={x.lead}
        info={x.info}
        important={x.important}
        actionLead={x.actionLead}
        bullets={x.bullets}
        stepHref={(n) => (adoptStepBuilt(n) ? `${base}/step-${n}` : undefined)}
      >
        {/* 🔒 ОСТРОВКУ — ТОЛЬКО ЕГО СЛОВА, И ЗДЕСЬ ЭТО ВАЖНЕЕ ОБЫЧНОГО. По проводу
            уезжает всё переданное, даже неотрисованное; в этом самом месте, на
            этой самой двери, однажды в разметку уехала форма замены слота с
            кнопкой «Да, заменить» на экран, где её быть не должно. Поэтому едет
            `x.action` — ровно словарь действия, а не `x` целиком. */}
        {/* ✗ 🔒 НАВИГАЦИИ ЗДЕСЬ НЕ БЫЛО ВОВСЕ, И ЭТО ОСТАВЛЯЛО ЧЕЛОВЕКА БЕЗ
            ДОРОГИ В КОНЦЕ САМОГО ВАЖНОГО ДЕЙСТВИЯ ПУТИ (35-10): замена прошла,
            шаг горит зелёным, а идти дальше не с чего.

            🔒 ПРАВИЛО ОБЩЕЕ, А НЕ ЗАПЛАТА НА ЭТУ СТРАНИЦУ: действие уступает
            место навигации, когда шаг закрыт. Так устроены все остальные шаги
            обоих путей; здесь его просто не позвали. */}
        {flowAdopted() ? (
          <StepNav
            prevHref={adoptStepBuilt(3) ? `${base}/step-3` : undefined}
            nextHref={adoptStepBuilt(4) ? `${base}/step-4` : undefined}
            labels={{ goPrev: x.goPrev, goNext: x.goNext }}
          />
        ) : (
          <AdoptConfirm
            donorUrl={flowValue("fork-url")}
            email={SUPPORT_EMAIL}
            labels={x.action}
          />
        )}
      </StepSection>
    </PageShell>
  );
}
