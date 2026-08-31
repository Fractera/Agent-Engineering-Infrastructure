// ШАГ 10 ВТОРОГО ПУТИ — ОБЩИЙ ХВОСТ (35-5, 2026-08-31).
//
// 🔒 ТЕ ЖЕ СЛОВА, ЧТО НА ШАГЕ 7 ПЕРВОГО ПУТИ, И ЭТО НЕ КОПИЯ. Обе страницы
// зовут один и тот же `TailStepPage` с одним и тем же `tailIndex`; отличаются
// только номер и знаменатель шкалы. Правка текста доезжает до обоих путей сразу
// или не доезжает ни до одного — третьего исхода нет.
//
// 🔒 ЗАЩИТА ОТ ПРЫЖКА ПРИШЛА В 35-6, КАК И БЫЛО ОБЕЩАНО. Решение считает путь —
// он и знает своё перечисление шагов, — а конструктор его только исполняет:
// общий файл не имеет права знать про один из путей больше, чем про другой.

import { adminHref } from "@/lib/admin-nav";
import { flowValue } from "@/lib/launch-flow";
import { TailStepPage } from "../../_shared/tail-page";
import { ADOPT_PATH_TOTAL, adoptStepBuilt, adoptPathName } from "../_strings";
import { adoptLockedFor } from "../_steps";

export const dynamic = "force-dynamic";

export default async function CustomFracteraRepoStepTen(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const base = `${adminHref(lang, "project-start")}/custom-fractera-repo`;

  return (
    <TailStepPage
      lang={lang}
      index={8}
      tailIndex={2}
      path={{
        slug: "custom-fractera-repo",
        // Адрес репозитория ЭТОГО пути — он уедет в подсказку агенту (75-9).
        repoUrl: flowValue("fork-url"),
        // Имя пути — тоже СЛОВО, значит зависит от языка (75-5).
        pageTitle: adoptPathName(lang).title,
        pageHint: adoptPathName(lang).hint,
        base,
        total: ADOPT_PATH_TOTAL,
        isBuilt: adoptStepBuilt,
        locked: adoptLockedFor(lang, 8),
      }}
    />
  );
}
