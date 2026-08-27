// ПОДСТРАНИЦА ПУТИ «СВОЙ РЕПОЗИТОРИЙ FRACTERA» (шаг 28-9, 2026-08-27).
//
// 🔒 ОНА ЗАВЕДЕНА ПУСТОЙ НАМЕРЕННО, И ЭТО СКАЗАНО НА НЕЙ ЖЕ. Владелец назвал две
// подстраницы и велел начинать с первого шага дефолтного пути. Шагов у этого
// пути пока нет — и страница честно говорит, что их нет, вместо того чтобы
// показывать кнопку, которая никуда не ведёт.
//
// ✗ Названная, но не обеспеченная возможность — приглашение импровизировать
// (первый закон `ANTI-PATTERNS.md`). Пустая страница с честной строкой лучше
// живой на вид кнопки: отсутствие вызывает вопрос, обещание вызывает выдумку.

import Link from "next/link";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../../_components/page-shell";
import { Lead, Small } from "@/components/ui/typography";

export const dynamic = "force-dynamic";

export default async function CustomFracteraRepoIndex(
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const ru = lang === "ru";

  return (
    <PageShell
      lang={lang}
      slug="project-start"
      s={s}
      params={{ file: "custom-fractera-repo" }}
      title={ru ? "Свой репозиторий Fractera" : "Your own Fractera repository"}
      hint={
        ru
          ? "Путь для проекта, который уже построен на Fractera: слот принимает его вместо шаблона."
          : "The way for a project already built on Fractera: the slot takes it in place of the template."
      }
    >
      <Lead>
        {ru ? "Шаги этого пути ещё не построены." : "The steps of this way are not built yet."}
      </Lead>

      <Small className="mt-4 block">
        {ru
          ? "Здесь будет проверка донора: адрес обязан ответить, у проекта обязана быть форма, которую слот ожидает, и клон обязан лечь в соседнюю папку — только тогда происходит замена."
          : "The donor check will live here: the address must answer, the project must have the shape the slot expects, and the clone must land in a folder next door — only then does the swap happen."}
      </Small>

      <Link
        href={adminHref(lang, "project-start")}
        className="mt-8 inline-flex h-11 items-center justify-center rounded-lg border border-border px-6 text-[length:var(--fs-small)] transition-colors hover:border-foreground/30"
      >
        {ru ? "Вернуться к выбору пути" : "Back to the choice of path"}
      </Link>
    </PageShell>
  );
}
