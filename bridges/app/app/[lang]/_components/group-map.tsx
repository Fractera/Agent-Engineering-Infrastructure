import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageShell } from "./page-shell";
import { NAV_BY_GROUP, adminHref, type NavGroup, type AdminPageSlug } from "@/lib/admin-nav";
import { GROUP_INDEX } from "@/lib/admin-nav";
import type { AdminStrings } from "@/lib/i18n/admin-strings";

// Карта группы — страница-маршрутизатор (решение владельца 2026-08-09).
//
// ЗАЧЕМ. Серединный сегмент хлебных крошек указывал на категорию, у которой не
// было своей страницы, — то есть вернуться на уровень выше было некуда. Теперь у
// каждой группы есть карта, и путь ведёт на неё.
//
// ОДИН КОМПОНЕНТ НА ВСЕ ГРУППЫ. Восемь копий одной разметки разошлись бы при
// первой правке, а список разделов и так живёт в навигации — брать его оттуда
// значит не иметь второго списка, который можно забыть обновить.
//
// Себя карта в списке не показывает: пункт, ведущий на страницу, где ты стоишь,
// ничего не открывает.

export function GroupMap(
  { group, lang, s, intro }: {
    group: NavGroup;
    lang: string;
    s: AdminStrings;
    /** Пояснение к группе — почему эти разделы вместе. */
    intro?: string;
  },
) {
  const self = GROUP_INDEX[group];
  const slugs = NAV_BY_GROUP[group].filter((x) => x !== self) as AdminPageSlug[];
  const page = s.pages[self];

  return (
    <PageShell lang={lang} slug={self} s={s} title={page.title} hint={page.hint}>
      {intro && (
        <p className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
          {intro}
        </p>
      )}

      <ul className={`${intro ? "mt-3" : ""} divide-y divide-border rounded-lg border border-border`}>
        {slugs.map((slug) => (
          <li key={slug}>
            <Link href={adminHref(lang, slug)} className="flex gap-3 px-3 py-2.5 hover:bg-muted">
              <div className="min-w-0 flex-1">
                <span className="text-[12px] font-medium text-foreground">{s.pages[slug].title}</span>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{s.pages[slug].hint}</p>
              </div>
              <ChevronRight size={13} className="mt-1 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
