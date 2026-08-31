// ШАГ 8 ВТОРОГО ПУТИ — ОБЩИЙ ХВОСТ (35-5, 2026-08-31).
//
// 🔒 ТЕ ЖЕ СЛОВА, ЧТО НА ШАГЕ 5 ПЕРВОГО ПУТИ, И ЭТО НЕ КОПИЯ. Обе страницы
// зовут один и тот же `TailStepPage` с одним и тем же `tailIndex`; отличаются
// только номер и знаменатель шкалы. Правка текста доезжает до обоих путей сразу
// или не доезжает ни до одного — третьего исхода нет.
//
// 🔒 ЗАЩИТА ОТ ПРЫЖКА ПРИШЛА В 35-6, КАК И БЫЛО ОБЕЩАНО. Решение считает путь —
// он и знает своё перечисление шагов, — а конструктор его только исполняет:
// общий файл не имеет права знать про один из путей больше, чем про другой.

import { adminHref } from "@/lib/admin-nav";
import { TailStepPage } from "../../_shared/tail-page";
import { ADOPT_PATH_TOTAL, adoptStepBuilt, ADOPT_PATH_TITLE, ADOPT_PATH_HINT } from "../_strings";
import { adoptLockedFor } from "../_steps";

export const dynamic = "force-dynamic";

export default async function CustomFracteraRepoStepEight(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const base = `${adminHref(lang, "project-start")}/custom-fractera-repo`;

  return (
    <TailStepPage
      lang={lang}
      index={6}
      tailIndex={0}
      path={{
        slug: "custom-fractera-repo",
        pageTitle: ADOPT_PATH_TITLE,
        pageHint: ADOPT_PATH_HINT,
        base,
        total: ADOPT_PATH_TOTAL,
        isBuilt: adoptStepBuilt,
        locked: adoptLockedFor(lang, 6),
      }}
    />
  );
}
