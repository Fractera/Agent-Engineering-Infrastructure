"use client";

import { linksOf } from "../../../_data/record.schema";
import { useCallback, useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { vectorMemoryStrings } from "../i18n";
import { onRunCompleted } from "../../shared/run-events";
import { DataTable, type TableColumn } from "../../shared/data-table.client";

// ПУБЛИЧНАЯ ПОЛОВИНА ВЕКТОРНОЙ ПАМЯТИ — таблица записей-фактов + поиск. Продуктовая поверхность (закон
// владельца): вся логика памяти живёт здесь, где её развивает агент по заявке. Добавление записи (модалка с
// обрезкой) — Кокпит-инструмент из `_shared-v2`, открывается кнопкой «Добавить запись» из ряда поиска
// (DOM-событие `fractera:vector-add`, закон 0 не даёт публичной таблице тянуть внешний слой).
//
// СУТЬ записи — текст-факт (`content`). СВЯЗИ читаются из единственного представления `links` через
// `linksOf` (311.9а.2); прежнее поле `storageIds` осталось лишь фолбэком для строк, записанных раньше.
// Показываются СТОЛБИКОМ СОКРАЩЁННЫХ ИДЕНТИФИКАТОРОВ С КОПИРОВАНИЕМ, тем же дизайном, что колонка ID.
// Строка памяти — КВИТАНЦИЯ, а не копия текста (311.9а.4): показываем `summary`. `content` остаётся
// фолбэком для строк, записанных до этого шага, — полный текст теперь живёт только в поисковом индексе.
type Row = { id: string; createdAt: string; name?: unknown; summary?: unknown; content?: unknown; storageIds?: unknown } & Record<string, unknown>;
const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";
const TABLE = "vector-memory";

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

export default function MainVectorMemoryClient({ lang, mode }: { lang: string; mode: "view" | "admin" }) {
  const t = vectorMemoryStrings(lang);
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState(""); // текст в поле
  const [applied, setApplied] = useState(""); // что реально искали (кнопкой/Enter)
  const [loaded, setLoaded] = useState(false);
  // Состав колонок — из ЯДРА (закон вкладки базы, шаг 324): пока список жил в компоненте, закон
  // исполнялся, а владелец видел устаревшую таблицу. Колонок нет — таблица не рисуется, и это честно.
  const [columns, setColumns] = useState<TableColumn[]>([]);
  useEffect(() => {
    let alive = true;
    fetch(`${apiBase()}/core?select=tab:vector-memory`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { entities?: { data?: { columns?: TableColumn[] } }[]; entity?: { data?: { columns?: TableColumn[] } } } | null) => {
        if (alive) setColumns(d?.entities?.[0]?.data?.columns ?? d?.entity?.data?.columns ?? []);
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

  const runSearch = () => { const q = query.trim(); setApplied(q); load(q); };

  const del = async (id: string) => {
    if (!window.confirm(t.confirmDelete)) return;
    await fetch(`${apiBase()}/rows?table=${TABLE}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    load(applied);
  };

  const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(lang) : "—");
  const fmtContent = (v: unknown) => {
    const s = String(v ?? "").trim();
    if (!s) return "—";
    return s.length > 80 ? `${s.slice(0, 80)}…` : s;
  };

  return (
    <div className="space-y-3" data-entity-view="vector-memory">
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
          <Button size="sm" onClick={() => window.dispatchEvent(new CustomEvent("fractera:vector-add"))}>
            {t.addRecord}
          </Button>
        ) : null}
      </div>

      {/* Результат явного поиска: сколько записей нашлось по применённому запросу. */}
      {applied ? <p className="text-xs text-muted-foreground">{t.found}: {rows.length}</p> : null}

      {/* Единый интерфейс таблиц: минимальная ширина колонки + горизонтальная прокрутка, страница в
          10 записей, ячейка не выше четырёх строк. Связи — массивы (закон 324 §2). */}
      {loaded ? (
        <DataTable
          columns={columns}
          rows={rows}
          lang={lang}
          strings={{ copy: t.copy, empty: t.empty, page: t.page, of: t.of }}
          // Строки, записанные до 311.9а.4, несут `content` вместо `summary` — показываем их честно.
          renderCell={(r, c) => (c.key === "summary" && r.summary === undefined && r.content !== undefined
            ? <span className="line-clamp-4 break-words" title={String(r.content)}>{String(r.content)}</span>
            : undefined)}
          rowActions={mode === "admin" ? (r) => (
            <Button variant="outline" size="xs" onClick={() => del(r.id)}>{t.del}</Button>
          ) : undefined}
        />
      ) : null}
    </div>
  );
}
