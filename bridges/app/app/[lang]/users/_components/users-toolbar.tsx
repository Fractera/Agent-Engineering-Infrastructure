// Поиск и постраничность (шаг 501, Ф2). СЕРВЕРНЫЕ компоненты.
//
// Главное отличие от старой панели: и то и другое живёт в АДРЕСЕ, а не в
// состоянии браузера. Поиск — обычная форма `method="get"`, страницы — обычные
// ссылки. Следствия:
//   • работает при выключенном JS;
//   • результат поиска можно сохранить в закладки и переслать;
//   • «назад» в браузере возвращает предыдущий запрос, а не пустую таблицу.
// Прежний вариант с задержкой 300 мс на каждой букве этих свойств не давал.

import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function UsersSearch({ q, placeholder, submit }: { q: string; placeholder: string; submit: string }) {
  return (
    <form method="get" className="flex items-center gap-2">
      {/* Новый поиск обязан начинаться с первой страницы: искать на пятой
          странице прежнего запроса — способ увидеть пусто и не понять почему. */}
      <input type="hidden" name="page" value="1" />
      <Input name="q" defaultValue={q} placeholder={placeholder} className="h-7 text-[11px]" />
      <Button type="submit" variant="outline" size="sm" className="h-7 shrink-0 text-[11px]">
        <Search size={11} />
        <span className="hidden sm:inline">{submit}</span>
      </Button>
    </form>
  );
}

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
