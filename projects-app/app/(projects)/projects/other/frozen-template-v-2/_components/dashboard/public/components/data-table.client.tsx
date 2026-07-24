"use client";

import { useMemo, useState } from "react";
import { Columns3 } from "lucide-react";
import type { Column } from "../../columns";
import { dashboardStrings } from "../../i18n";
import { pick } from "../../../shared/localized";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

// ТАБЛИЦА ДАННЫХ — ВИДИМАЯ ЧАСТЬ ПЕРЕНЕСЕНА ИЗ v1 ОДИН-В-ОДИН (`_shared/entities/dashboard/view/table.tsx`):
// панель инструментов с поиском и выбором колонок, сама таблица, клик по строке открывает карточку записи,
// внизу счётчик «показано N из M» и кнопка «показать ещё». Элементы интерфейса — примитивы shadcn (решение A,
// шаг 298): поиск = `Input`, выбор колонок = `DropdownMenu` с галочками, кнопка «ещё» = `Button`, карточка
// записи = `Dialog`. Сама таблица остаётся `<table>` (полноценного DataTable-примитива в стеке нет),
// оформлена токенами shadcn.
//
// Строки приходят СВЕРХУ, уже прочитанными на сервере: страница остаётся рабочей без JavaScript (канон
// статики), а поиск, выбор колонок и карточка — надстройка поверх готовой разметки.
const PAGE = 20;

export type Row = Record<string, unknown> & { id: string };

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v);
  const s = String(v);
  // дата приходит ISO-строкой — показываем по-человечески, как в v1
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  }
  return s;
}

export default function DataTable({ columns, rows, lang }: { columns: Column[]; rows: Row[]; lang: string }) {
  const L = dashboardStrings(lang);
  const [search, setSearch] = useState("");
  const [hidden, setHidden] = useState<string[]>([]);
  const [limit, setLimit] = useState(PAGE);
  const [detail, setDetail] = useState<Row | null>(null);

  const shownColumns = columns.filter((c) => !hidden.includes(c.key));
  const label = (c: Column) => pick(c.label, lang) || c.key;

  const found = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => columns.some((c) => String(r[c.key] ?? "").toLowerCase().includes(q)));
  }, [rows, columns, search]);

  const page = found.slice(0, limit);

  if (columns.length === 0) return <p className="py-2 text-sm text-muted-foreground">{L.noColumns}</p>;

  return (
    <div className="space-y-3" data-dashboard-table="view">
      {/* ПАНЕЛЬ ИНСТРУМЕНТОВ — поиск слева, выбор колонок справа (раскладка v1) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setLimit(PAGE); }}
          placeholder={L.search}
          className="w-full max-w-xs"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns3 />
              {L.columns}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {columns.map((c) => (
              <DropdownMenuCheckboxItem
                key={c.key}
                checked={!hidden.includes(c.key)}
                onCheckedChange={() =>
                  setHidden((h) => (h.includes(c.key) ? h.filter((k) => k !== c.key) : [...h, c.key]))
                }
                onSelect={(e) => e.preventDefault()}
              >
                <span className="truncate">{label(c)}</span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {rows.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">{L.empty}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  {shownColumns.map((c) => (
                    <th key={c.key} className="py-2 pr-4 font-medium">{label(c)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {page.map((r) => (
                  // клик по строке открывает карточку записи — как в v1
                  <tr
                    key={r.id}
                    onClick={() => setDetail(r)}
                    className="cursor-pointer border-b last:border-b-0 hover:bg-muted/40"
                  >
                    {shownColumns.map((c) => (
                      <td key={c.key} className="py-2 pr-4 align-top">{cell(r[c.key])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {L.rowsShown.replace("{n}", String(page.length)).replace("{total}", String(found.length))}
            </span>
            {page.length < found.length ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setLimit((n) => n + PAGE)}>
                {L.more}
              </Button>
            ) : null}
          </div>
        </>
      )}

      {/* КАРТОЧКА ЗАПИСИ — все поля строки, включая скрытые в таблице колонки (поведение v1) */}
      <Dialog open={detail !== null} onOpenChange={(open) => { if (!open) setDetail(null); }}>
        <DialogContent showCloseButton={false} className="max-h-[80vh] max-w-md overflow-y-auto">
          <DialogHeader className={cn("flex-row items-center justify-between space-y-0")}>
            <DialogTitle className="text-sm font-medium">{L.details}</DialogTitle>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">{L.close}</Button>
            </DialogClose>
          </DialogHeader>
          {detail ? (
            <dl className="space-y-2">
              {columns.map((c) => (
                <div key={c.key} className="grid grid-cols-3 gap-2">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label(c)}</dt>
                  <dd className="col-span-2 text-sm">{cell(detail[c.key])}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
