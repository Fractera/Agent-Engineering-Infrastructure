// ШАГ 6 ПЕРВОГО ПУТИ — ОБЩИЙ ХВОСТ (переехал в _shared 35-5, 2026-08-31).
//
// 🔒 ФАЙЛ ОСТАЛСЯ, А ТЕЛО УЕХАЛО, И ЭТО НЕ ФОРМАЛЬНОСТЬ. Маршрут Next задаётся
// расположением файла, поэтому страница обязана лежать здесь. Всё, что она
// делает, — называет СВОЙ номер и СВОИ правила запрета; сама секция шага и все
// его слова живут в `_shared/`, общие со вторым путём.
//
// 🔒 ЗАЩИТА ОТ ПРЫЖКА СЧИТАЕТСЯ ЗДЕСЬ (28-13), потому что читает перечисление
// шагов ЭТОГО пути. Открыт шаг, у которого закрыты все предыдущие; пройденный
// остаётся открытым — вернуться и заменить значение человек вправе (28-18).

import { adminHref } from "@/lib/admin-nav";
import { flowValue } from "@/lib/launch-flow";
import { TailStepPage } from "../../_shared/tail-page";
import { pathSteps, stepOpen, currentStep } from "../_steps";
import { pathMapStrings, DEFAULT_TEMPLATE_TOTAL, DEFAULT_TEMPLATE_BUILT, defaultTemplatePathName } from "../_strings";

export const dynamic = "force-dynamic";

export default async function DefaultTemplateStepSix(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const base = `${adminHref(lang, "project-start")}/default-template`;

  const flowSteps = pathSteps(lang);
  const open = stepOpen(flowSteps, 6);
  const back = currentStep(flowSteps);
  const backN = back ? back.n : 1;
  const m = pathMapStrings(lang);

  return (
    <TailStepPage
      lang={lang}
      index={6}
      tailIndex={1}
      path={{
        slug: "default-template",
        // Адрес репозитория ЭТОГО пути — он уедет в подсказку агенту (75-9).
        repoUrl: flowValue("repo-url"),
        // Имя пути — тоже СЛОВО, значит зависит от языка (75-5).
        pageTitle: defaultTemplatePathName(lang).title,
        pageHint: defaultTemplatePathName(lang).hint,
        base,
        total: DEFAULT_TEMPLATE_TOTAL,
        isBuilt: (k) => k >= 1 && k <= DEFAULT_TEMPLATE_BUILT,
        locked: open
          ? null
          : {
              message: m.lockedMessage.replace("{n}", String(backN)),
              backHref: `${base}/step-${backN}`,
              backLabel: m.lockedBack.replace("{n}", String(backN)),
            },
      }}
    />
  );
}
