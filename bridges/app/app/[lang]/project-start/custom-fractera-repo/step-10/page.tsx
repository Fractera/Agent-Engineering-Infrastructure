// ШАГ 10 ВТОРОГО ПУТИ — ОБЩИЙ ХВОСТ (35-5, 2026-08-31).
//
// 🔒 ТЕ ЖЕ СЛОВА, ЧТО НА ШАГЕ 7 ПЕРВОГО ПУТИ, И ЭТО НЕ КОПИЯ. Обе страницы
// зовут один и тот же `TailStepPage` с одним и тем же `tailIndex`; отличаются
// только номер и знаменатель шкалы. Правка текста доезжает до обоих путей сразу
// или не доезжает ни до одного — третьего исхода нет.
//
// 🔒 ЗАЩИТЫ ОТ ПРЫЖКА У ВТОРОГО ПУТИ ПОКА НЕТ, и это не забыто: она читает
// перечисление шагов пути, которого ещё не существует (придёт в 35-6). Пока
// путь передаёт `locked: null` — то есть говорит честно «я не запираю», а не
// притворяется, что проверил.

import { adminHref } from "@/lib/admin-nav";
import { TailStepPage } from "../../_shared/tail-page";
import { ADOPT_PATH_TOTAL, adoptStepBuilt } from "../_strings";

export const dynamic = "force-dynamic";

export default async function CustomFracteraRepoStepTen(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const base = `${adminHref(lang, "project-start")}/custom-fractera-repo`;

  return (
    <TailStepPage
      lang={lang}
      index={10}
      tailIndex={2}
      path={{
        slug: "custom-fractera-repo",
        base,
        total: ADOPT_PATH_TOTAL,
        isBuilt: adoptStepBuilt,
        locked: null,
      }}
    />
  );
}
