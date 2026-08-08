// Раздел «Векторная память» (шаг 501, Ф2, партия 5).
//
// НИ ОДНОГО КЛИЕНТСКОГО ОСТРОВКА. Здесь всё, что делала старая панель, делает
// сервер: читает состояние склада и выполняет поиск по смыслу по запросу из
// адреса. Поэтому раздел читается с выключенным JS целиком, вместе с
// результатами, а ссылку с найденным можно переслать.
//
// Динамическая: и состояние склада, и результат поиска — живые. Запекать нельзя.
// Канон разрешает это служебным страницам архитектора; объявлено НА СТРАНИЦЕ.

import Link from "next/link";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { SearchForm } from "../_components/search-form";
import { readStatus, searchVectors } from "./_lib/vectors";
import { HitsTable } from "./_components/hits-table";

export const dynamic = "force-dynamic";

const fill = (t: string, vars: Record<string, string>) =>
  t.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);

export default async function VectorMemoryPage(
  { params, searchParams }: {
    params: Promise<{ lang: string }>;
    searchParams: Promise<{ q?: string }>;
  },
) {
  const { lang } = await params;
  const { q = "" } = await searchParams;
  const s = getAdminStrings(lang);
  const v = s.vector;

  const status = await readStatus();
  // Пустой запрос не тратит вызов встраивания: искать «ничего» незачем.
  const found = q.trim() ? await searchVectors(q.trim(), 5) : null;

  return (
    <PageShell title={s.pages["vector-memory"].title} hint={s.pages["vector-memory"].hint}>
      {!status.ok ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-[12px] font-medium text-destructive">{v.unavailable}</p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{status.reason}</p>
        </div>
      ) : (
        <>
          {/* Одна горизонтальная полоса показаний вместо вертикального списка: на
              всю ширину рабочей области список в две колонки тянул бы взгляд вниз
              без всякой пользы. */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border px-3 py-2 font-mono text-[11px]">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-muted-foreground">{v.keyLabel}</span>
              <span className={status.status.configured ? "text-green-600 dark:text-green-400" : "text-orange-500"}>
                {status.status.configured ? v.keySet : v.keyNotSet}
              </span>
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-muted-foreground">{v.modelLabel}</span>
              <span className="text-foreground">{status.status.model}</span>
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-muted-foreground">{v.dimsLabel}</span>
              <span className="text-foreground">{status.status.dims}</span>
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-muted-foreground">{v.searchLabel}</span>
              <span className="text-foreground">{status.status.indexed ? v.indexed : v.linearScan}</span>
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-muted-foreground">{v.recordsLabel}</span>
              <span className="text-foreground">{status.status.count}</span>
            </span>
            <span className="ml-auto text-muted-foreground/60">{v.serviceNote}</span>
          </div>

          {!status.status.configured && (
            <p className="mt-2 rounded-md border border-orange-500/30 bg-orange-500/5 px-2.5 py-2 text-[10px] leading-relaxed text-orange-700 dark:text-orange-300">
              {v.noKey}{" "}
              <Link href={adminHref(lang, "openai")} className="underline">{s.pages.openai.title}</Link>
            </p>
          )}

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="whitespace-nowrap text-[11px] text-muted-foreground">{v.searchByMeaning}</span>
            {/* Ввод намеренно узкий: поле во всю ширину нечитаемо. */}
            <div className="w-full max-w-md">
              <SearchForm value={q} placeholder={v.searchPlaceholder} submit={v.search} />
            </div>
            {found?.ok && (
              <span className="font-mono text-[10px] whitespace-nowrap text-muted-foreground">
                {fill(v.matches, { count: String(found.hits.length) })}
              </span>
            )}
          </div>

          <div className="mt-2">
            {found === null ? (
              <p className="py-8 text-center text-[11px] text-muted-foreground">{v.askSomething}</p>
            ) : !found.ok ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
                <p className="text-[12px] font-medium text-destructive">{v.searchFailed}</p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">{found.reason}</p>
              </div>
            ) : found.hits.length === 0 ? (
              <p className="py-8 text-center text-[11px] text-muted-foreground">{v.nothingFound}</p>
            ) : (
              <HitsTable
                hits={found.hits}
                labels={{ score: v.colScore, collection: v.colCollection, row: v.colRow, text: v.colText }}
              />
            )}
          </div>
        </>
      )}

      <HelpDetails label={v.helpLabel}>
        <p><strong>{v.helpGetTitle}</strong> {v.helpGet}</p>
        <p><strong>{v.helpWhyTitle}</strong> {v.helpWhy}</p>
        <p><strong>{v.helpWinsTitle}</strong> {v.helpWins}</p>
        <p><strong>{v.helpCostTitle}</strong> {v.helpCost}</p>
        <p><strong>{v.helpWeakTitle}</strong> {v.helpWeak}</p>
        <p><strong>{v.helpSeparateTitle}</strong> {v.helpSeparate}</p>
      </HelpDetails>
    </PageShell>
  );
}
