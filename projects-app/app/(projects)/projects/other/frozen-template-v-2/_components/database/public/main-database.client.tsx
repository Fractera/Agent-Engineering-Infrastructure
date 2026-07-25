"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { databaseStrings } from "../i18n";
import { onRunCompleted } from "../../shared/run-events";

// ПУБЛИЧНАЯ ПОЛОВИНА ЛОКАЛЬНОЙ БАЗЫ — таблица записей + поиск. Продуктовая поверхность (закон владельца):
// логика таблицы живёт здесь, где её развивает агент по заявке. Добавление строки (модалка с обрезкой) —
// Кокпит-инструмент из `_shared-v2`, открывается кнопкой «Добавить запись» из ряда поиска (DOM-событие,
// закон 0 не даёт публичной таблице тянуть внешний слой).
//
// СВЯЗИ ВСЕХ-КО-ВСЕМ: каждая строка несёт `storageIds: string[]` (ссылки на записи объектного хранилища) и
// `vectorIds: string[]` (ссылки на записи векторной базы). В таблице обе связи показываются СТОЛБИКОМ
// СОКРАЩЁННЫХ ИДЕНТИФИКАТОРОВ С КОПИРОВАНИЕМ — тем же дизайном, что колонка ID. Самих изображений тут НЕ
// показываем (решение владельца): у строки может быть массив картинок, поэтому вместо картинки — id.
type Row = { id: string; createdAt: string; name?: unknown; storageIds?: unknown; vectorIds?: unknown } & Record<string, unknown>;
const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";
const TABLE = "database";
const asIds = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

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

export default function MainDatabaseClient({ lang, mode }: { lang: string; mode: "view" | "admin" }) {
  const t = databaseStrings(lang);
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState(""); // текст в поле
  const [applied, setApplied] = useState(""); // что реально искали (кнопкой/Enter)
  const [loaded, setLoaded] = useState(false);

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
                <th className="p-2 font-medium">{t.id}</th>
                <th className="p-2 font-medium">{t.name}</th>
                <th className="p-2 font-medium">{t.storageLinks}</th>
                <th className="p-2 font-medium">{t.vectorLinks}</th>
                <th className="p-2 font-medium">{t.added}</th>
                {mode === "admin" ? <th className="p-2" /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b align-top last:border-0">
                  <td className="p-2">
                    <IdChip id={r.id} copyLabel={t.copy} />
                  </td>
                  <td className="p-2">{String(r.name ?? "—")}</td>
                  <td className="p-2">
                    <IdChipColumn ids={asIds(r.storageIds)} copyLabel={t.copy} />
                  </td>
                  <td className="p-2">
                    <IdChipColumn ids={asIds(r.vectorIds)} copyLabel={t.copy} />
                  </td>
                  <td className="p-2 tabular-nums">{fmtDate(r.createdAt)}</td>
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
