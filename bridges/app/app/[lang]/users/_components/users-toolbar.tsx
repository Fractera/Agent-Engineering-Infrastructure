// Постраничность (шаг 501, Ф2). СЕРВЕРНЫЙ компонент.
//
// Страницы живут в АДРЕСЕ и переключаются обычными ссылками — работает без JS, и
// любую страницу можно сохранить в закладки. Поиск переехал в общий
// `[lang]/_components/search-form.tsx`, как только у него появился второй
// потребитель.

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function UsersPagination(
  { q, page, pages, total, totalLabel, pageLabel }:
  { q: string; page: number; pages: number; total: number; totalLabel: string; pageLabel: string },
) {
  const href = (p: number) => {
    const params = new URLSearchParams({ page: String(p) });
    if (q) params.set("q", q);
    return `?${params}`;
  };

  const fill = (t: string, vars: Record<string, string>) =>
    t.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);

  return (
    <div className="flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
      <span>{fill(totalLabel, { total: String(total) })}</span>
      <div className="flex items-center gap-2">
        {/* Недоступная страница — не ссылка, а текст: ссылка, ведущая в никуда,
            обманывает и мышь, и клавиатуру. */}
        {page > 1
          ? <Link href={href(page - 1)} aria-label="previous" className="hover:text-foreground"><ChevronLeft size={14} /></Link>
          : <span className="opacity-30"><ChevronLeft size={14} /></span>}
        <span>{fill(pageLabel, { page: String(page), pages: String(pages) })}</span>
        {page < pages
          ? <Link href={href(page + 1)} aria-label="next" className="hover:text-foreground"><ChevronRight size={14} /></Link>
          : <span className="opacity-30"><ChevronRight size={14} /></span>}
      </div>
    </div>
  );
}
