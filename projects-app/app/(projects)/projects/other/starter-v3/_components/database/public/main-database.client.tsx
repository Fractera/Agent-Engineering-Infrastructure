"use client";

import { linksOf } from "../../../_data/record.schema";
import { useCallback, useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { databaseStrings } from "../i18n";
import { onRunCompleted, onExternalRefresh } from "../../shared/run-events";

// ПУБЛИЧНАЯ ПОЛОВИНА ЛОКАЛЬНОЙ БАЗЫ — таблица записей + поиск. Продуктовая поверхность (закон владельца):
// логика таблицы живёт здесь, где её развивает агент по заявке. Добавление строки (модалка с обрезкой) —
// Кокпит-инструмент из `_shared-v2`, открывается кнопкой «Добавить запись» из ряда поиска (DOM-событие,
// закон 0 не даёт публичной таблице тянуть внешний слой).
//
// СВЯЗИ ВСЕХ-КО-ВСЕМ читаются из ЕДИНСТВЕННОГО представления — `links: {table,id}[]` (311.9а.2), а вид
// «ссылки на такой-то склад» выводится `linksOf`. Прежние поля-на-соседа `storageIds`/`vectorIds` были
// вторым домом того же факта и требовали нового поля под каждый новый склад; они остались лишь как
// фолбэк для строк, записанных до этого шага. Связи показываются СТОЛБИКОМ СОКРАЩЁННЫХ ИДЕНТИФИКАТОРОВ
// С КОПИРОВАНИЕМ — тем же дизайном, что колонка ID. Самих изображений тут НЕ показываем (решение
// владельца): у строки может быть массив картинок, поэтому вместо картинки — id.
type Row = { id: string; createdAt: string; name?: unknown; storageIds?: unknown; vectorIds?: unknown } & Record<string, unknown>;
const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";
const TABLE = "database";

// Один сокращённый id + иконка копирования (единый дизайн колонки ID).
function IdChip({ id, copyLabel }: { id: string; copyLabel: string }) {
  const [copied, setCopied] = useState(false);
  const shown = id.length > 5 ? `${id.slice(0, 5)}…` : id;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* буфер недоступен — тихо */
    }
  };
  return (
    <span className="inline-flex items-center gap-1 font-mono text-xs" title={id}>
      {shown}
      <button type="button" onClick={copy} aria-label={copyLabel} className="text-muted-foreground transition-colors hover:text-foreground">
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </span>
  );
}

// Массив id столбиком (каждый — свой копируемый чип). Пустой массив рисует прочерк.
function IdChipColumn({ ids, copyLabel }: { ids: string[]; copyLabel: string }) {
  if (ids.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex flex-col gap-1">
      {ids.map((id) => (
        <IdChip key={id} id={id} copyLabel={copyLabel} />
      ))}
    </span>
  );
}

// 🔒 КОЛОНКА ОБЪЯВЛЕНА В ЯДРЕ, А НЕ ЗДЕСЬ (шаг 324). Пока список колонок был зашит в этом файле, закон
// записи исполнялся полностью, а владелец видел устаревшую таблицу: связи с картой и календарём в строке
// БЫЛИ, а колонок для них не существовало. Теперь состав приходит из `entity.data.columns`.
type Column = { key: string; label: Record<string, string>; type: "chip" | "text" | "ids" | "date"; source: string };

/** Значение ячейки по её источнику: `links:<склад>` — массив id, иначе поле строки. */
const cellValue = (row: Row, source: string): unknown =>
  source.startsWith("links:") ? linksOf(row, source.slice("links:".length), row[`${source.slice("links:".length)}Ids`]) : row[source];

export default function MainDatabaseClient({ lang, mode }: { lang: string; mode: "view" | "admin" }) {
  const t = databaseStrings(lang);
  const [rows, setRows] = useState<Row[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [query, setQuery] = useState(""); // текст в поле
  const [applied, setApplied] = useState(""); // что реально искали (кнопкой/Enter)
  const [loaded, setLoaded] = useState(false);

  // Состав колонок — из ядра. Двери нет / колонки не объявлены → таблица не рисуется, и это честно:
  // молча показать «что получилось» значит вернуть тот самый дефект, ради которого объявление и заведено.
  useEffect(() => {
    let alive = true;
    fetch(`${apiBase()}/core?select=tab:database`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { entities?: { data?: { columns?: Column[] } }[] } | null) => {
        if (alive) setColumns(d?.entities?.[0]?.data?.columns ?? []);
      })
      .catch(() => { /* нет двери — колонок не будет */ });
    return () => { alive = false; };
  }, []);

  const load = useCallback((q: string) => {
    fetch(`${apiBase()}/rows?table=${TABLE}&limit=200&search=${encodeURIComponent(q)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { rows?: Row[] } | null) => { setRows(d?.rows ?? []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  // Первичная загрузка — весь список. Дальше поиск запускает ТОЛЬКО кнопка «Искать» (или Enter),
  // а не каждый введённый символ (требование владельца: явная кнопка, явный результат).
  useEffect(() => { load(""); }, [load]);

  useEffect(() => onRunCompleted(() => load(applied)), [load, applied]);
  useEffect(() => onExternalRefresh(() => load(applied)), [load, applied]); // прогон из Telegram (сервер) — 308

  const runSearch = () => { const q = query.trim(); setApplied(q); load(q); };

  const del = async (id: string) => {
    if (!window.confirm(t.confirmDelete)) return;
    await fetch(`${apiBase()}/rows?table=${TABLE}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    load(applied);
  };

  const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(lang) : "—");

  return (
    <div className="space-y-3" data-entity-view="database">
      {/* Ряд поиска: слева поиск, справа кнопка «Добавить запись» (только кокпит) — шлёт DOM-событие,
          модалку с обрезкой показывает Кокпит-инструмент из дев-слоя. */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
            placeholder={t.search}
            className="max-w-xs"
          />
          <Button variant="secondary" size="sm" onClick={runSearch}>{t.searchBtn}</Button>
        </div>
        {mode === "admin" ? (
          <Button size="sm" onClick={() => window.dispatchEvent(new CustomEvent("fractera:database-add"))}>
            {t.addRecord}
          </Button>
        ) : null}
      </div>

      {/* Результат явного поиска: сколько записей нашлось по применённому запросу. */}
      {applied ? <p className="text-xs text-muted-foreground">{t.found}: {rows.length}</p> : null}

      {loaded && rows.length === 0 ? <p className="text-sm text-muted-foreground">{t.empty}</p> : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="p-2 font-medium">{c.label[lang] ?? c.label.en ?? c.key}</th>
                ))}
                {mode === "admin" ? <th className="p-2" /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b align-top last:border-0">
                  {columns.map((c) => {
                    const v = cellValue(r, c.source);
                    if (c.type === "chip") return <td key={c.key} className="p-2"><IdChip id={String(v ?? "")} copyLabel={t.copy} /></td>;
                    // Связь — ВСЕГДА массив (закон 324 §2): у записи бывает несколько объектов, меток и событий.
                    if (c.type === "ids") return <td key={c.key} className="p-2"><IdChipColumn ids={Array.isArray(v) ? v : []} copyLabel={t.copy} /></td>;
                    if (c.type === "date") return <td key={c.key} className="p-2 tabular-nums">{fmtDate(String(v ?? ""))}</td>;
                    const s = String(v ?? "");
                    return <td key={c.key} className="p-2 max-w-xs" title={s}>{s ? (s.length > 80 ? `${s.slice(0, 80)}…` : s) : "—"}</td>;
                  })}
                  {mode === "admin" ? (
                    <td className="p-2 text-right">
                      <Button variant="outline" size="xs" onClick={() => del(r.id)}>
                        {t.del}
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
