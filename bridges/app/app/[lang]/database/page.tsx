// Раздел «База данных» (шаг 501, Ф2, партия 3).
//
// Динамическая по той же причине, что «Пользователи»: строки — живые данные, их
// нельзя ни запечь, ни закешировать. Канон это разрешает служебным страницам
// архитектора; гейт роли стоит в `proxy.ts`. Объявлено НА СТРАНИЦЕ, не на layout.
//
// Всё состояние раздела живёт в адресе: какая таблица открыта (`?table=`), какая
// ячейка правится (`&edit=&col=`), какая строка удаляется (`&delete=`). Поэтому
// сетка строк целиком серверная, а клиентских островков ровно два — диалог правки
// и подтверждение удаления, — независимо от числа строк.

import Link from "next/link";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { listTables, readTable, ROW_LIMIT } from "./_lib/tables";
import { singleOptions, multiOptions } from "./_lib/column-options";
import { RowsGrid } from "./_components/rows-grid";
import { CellEditor } from "./_components/cell-editor.client";
import { RowRemover } from "./_components/row-remover.client";

export const dynamic = "force-dynamic";

const fill = (t: string, vars: Record<string, string>) =>
  t.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);

export default async function DatabasePage(
  { params, searchParams }: {
    params: Promise<{ lang: string }>;
    searchParams: Promise<{ table?: string; edit?: string; col?: string; delete?: string }>;
  },
) {
  const { lang } = await params;
  const sp = await searchParams;
  const s = getAdminStrings(lang);
  const d = s.database;

  const list = listTables();
  const tables = list.ok ? list.tables : [];
  // Без выбора открывается первая таблица — как делала старая панель.
  const active = sp.table && tables.includes(sp.table) ? sp.table : tables[0];
  const data = active ? readTable(active) : null;

  const base = `/${lang}/database`;
  const tableHref = (t: string) => `${base}?table=${encodeURIComponent(t)}`;
  const closeHref = active ? tableHref(active) : base;
  const editHref = (rowId: string, column: string) =>
    `${closeHref}&edit=${encodeURIComponent(rowId)}&col=${encodeURIComponent(column)}`;
  const deleteHref = (rowId: string) => `${closeHref}&delete=${encodeURIComponent(rowId)}`;

  // Что именно правится — читаем из адреса и сверяем с настоящими данными:
  // выдуманные `edit`/`col` не должны открывать диалог ни о чём.
  const editing =
    data?.ok && sp.edit && sp.col && data.columns.includes(sp.col)
      ? data.rows.find((r) => String(r.id) === sp.edit)
      : undefined;
  const removing = data?.ok && sp.delete
    ? data.rows.find((r) => String(r.id) === sp.delete)
    : undefined;

  return (
    <PageShell title={s.pages.database.title} hint={s.pages.database.hint}>
      {!list.ok ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-[12px] font-medium text-destructive">{d.unavailable}</p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{list.reason}</p>
        </div>
      ) : tables.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">{d.noTables}</p>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Список таблиц — ссылки, поэтому переключение работает без JS и
              каждая таблица имеет свой адрес. */}
          <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto sm:w-48 sm:flex-col">
            {tables.map((t) => (
              <Link
                key={t}
                href={tableHref(t)}
                aria-current={t === active ? "true" : undefined}
                className={`shrink-0 rounded-md px-2 py-1 font-mono text-[11px] ${
                  t === active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {t}
              </Link>
            ))}
          </nav>

          <div className="min-w-0 flex-1">
            {data?.ok ? (
              <>
                <p className="mb-1.5 text-[10px] text-muted-foreground">
                  {fill(d.rowsShown, {
                    shown: String(data.rows.length),
                    total: String(data.total),
                    limit: String(ROW_LIMIT),
                  })}
                </p>
                <RowsGrid
                  table={active!}
                  columns={data.columns}
                  rows={data.rows}
                  hasId={data.hasId}
                  hrefFor={editHref}
                  deleteHrefFor={deleteHref}
                  labels={{ empty: d.empty, noIdColumn: d.noIdColumn, delete: d.delete, edit: d.editTitle }}
                />
              </>
            ) : (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
                <p className="text-[12px] font-medium text-destructive">{d.unavailable}</p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">{data?.reason}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {editing && active && sp.col && (
        <CellEditor
          table={active}
          rowId={String(editing.id)}
          column={sp.col}
          initialValue={editing[sp.col] === null || editing[sp.col] === undefined ? "" : String(editing[sp.col])}
          single={singleOptions(active, sp.col)}
          multi={multiOptions(active, sp.col)}
          closeHref={closeHref}
          labels={{
            editTitle: d.editTitle, valueLabel: d.valueLabel, cancel: d.cancel,
            save: d.save, updated: d.updated, failed: d.failed,
          }}
        />
      )}

      {removing && active && (
        <RowRemover
          table={active}
          rowId={String(removing.id)}
          closeHref={closeHref}
          labels={{
            title: d.deleteTitle, body: d.deleteBody, cancel: d.cancel,
            delete: d.delete, deleted: d.deletedRow, failed: d.failed,
          }}
        />
      )}

      <HelpDetails label={d.helpLabel}>
        <p><strong>{d.helpHoldsTitle}</strong> {d.helpHolds}</p>
        <p><strong>{d.helpVsVectorTitle}</strong> {d.helpVsVector}</p>
        <p><strong>{d.helpCostTitle}</strong> {d.helpCost}</p>
        <p><strong>{d.helpWeakTitle}</strong> {d.helpWeak}</p>
        <p><strong>{d.helpTogetherTitle}</strong> {d.helpTogether}</p>
      </HelpDetails>
    </PageShell>
  );
}
