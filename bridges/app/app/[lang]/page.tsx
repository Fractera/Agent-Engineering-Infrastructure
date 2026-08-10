// Холст покоя нового слоя панели (шаг 501). То, что видно по адресу `/en`.

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { NAV_GROUPS, NAV_BY_GROUP, adminHref } from "@/lib/admin-nav";
import { PageShell } from "./_components/page-shell";

export default async function AdminHomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);

  return (
    <PageShell title={s.home.title} hint={s.home.hint}>
      {/* 🔒 ПЕРВЫЙ ЭКРАН НЕ ДОЛЖЕН ПУГАТЬ (владелец 2026-08-10). Человек попадает
          сюда сразу после развёртывания и видит под этим абзацем несколько
          десятков разделов. Без объяснения он читает это как список того, что
          обязан настроить до начала работы, — и закрывает вкладку.

          Мягкий голубой, шрифт чуть крупнее остального текста страницы: это
          единственный абзац, который обязаны прочитать, и он же снимает
          напряжение, а не добавляет его. */}
      <div className="mb-5 rounded-lg border border-sky-500/25 bg-sky-500/5 p-4">
        <p className="text-[14px] font-medium leading-relaxed text-sky-800 dark:text-sky-200">
          {s.home.calmLead}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-sky-800/90 dark:text-sky-200/90">
          {s.home.calmOnly}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-sky-800/80 dark:text-sky-200/80">
          {s.home.calmRest}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-sky-800/80 dark:text-sky-200/80">
          {s.home.calmOptional}
        </p>
        <Link
          href={adminHref(lang, "github")}
          className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md bg-sky-600 px-3 text-[12px] font-medium text-white transition-colors hover:bg-sky-700"
        >
          {s.home.calmAction}<ArrowRight size={12} />
        </Link>
      </div>

      {/* Тот же список, что в гамбургере, — чтобы карту слоя было видно целиком
          с первого экрана.

          ЧЕТЫРЕ СТУПЕНИ ШИРИНЫ (владелец 2026-08-10): телефон — одна колонка,
          планшет — две, 1024 — три, широкий экран — четыре.

          🔒 МНОГОКОЛОНОЧНАЯ РАСКЛАДКА, А НЕ СЕТКА (владелец 2026-08-10). Сетка
          держит РЯДЫ: высота ряда равна самой высокой группе в нём, и рядом с
          «Документами разработки» из шестнадцати пунктов образуются три колонки
          пустоты. Многоколоночный поток раскладывает группы сам и подбирает
          разбивку так, чтобы контейнер вышел минимальной высоты, — длинная
          группа просто занимает колонку целиком.

          Запрет разрыва внутри группы обязателен: без него группа рвётся между
          колонками, заголовок остаётся в одной, а половина ссылок уезжает в
          другую. */}
      <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-4">
        {NAV_GROUPS.map((group) => (
          <section key={group} className="mb-4 break-inside-avoid">
            <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              {s.navGroups[group]}
            </h2>
            <ul className="space-y-0.5">
              {NAV_BY_GROUP[group].map((slug) => (
                <li key={slug}>
                  <Link
                    href={adminHref(lang, slug)}
                    className="block rounded-md px-2 py-1 text-[12px] text-foreground hover:bg-muted"
                  >
                    {s.pages[slug].title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
