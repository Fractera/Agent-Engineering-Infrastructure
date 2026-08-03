"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { storageStrings } from "../i18n";
import { onRunCompleted, onExternalRefresh } from "../../shared/run-events";
import { DataTable, type TableColumn } from "../../shared/data-table.client";
import { MediaPreview } from "../../tools/media-viewer/client/media-viewer.client";

// Ячейка идентификатора: длинный id ужимается до первых пяти символов + «…», рядом — иконка копирования
// полного значения (буфер обмена). Полный id всегда доступен в `title` при наведении.
function IdCell({ id, copyLabel }: { id: string; copyLabel: string }) {
  const [copied, setCopied] = useState(false);
  const shown = id.length > 5 ? `${id.slice(0, 5)}…` : id;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* буфер обмена недоступен (не-HTTPS / отказ) — тихо */
    }
  };
  return (
    <span className="inline-flex items-center gap-1 font-mono text-xs" title={id}>
      {shown}
      <button
        type="button"
        onClick={copy}
        aria-label={copyLabel}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </span>
  );
}

// ПУБЛИЧНАЯ ПОЛОВИНА СКЛАДА — таблица объектов + поиск. Продуктовая поверхность (закон владельца): вся
// логика склада живёт здесь, где агент читает и правит её по заявке «строить вместе с ИИ». Крода тут НЕТ —
// добавление изображения с обрезкой это Кокпит-инструмент из `_shared-v2`, он монтируется отдельно через
// dev-slot в админ-половине (публичной таблице внешний слой закрыт, закон 0).
//
// Строки — из общей двери `api/rows` (table="storage"), объекты (сами файлы) — из `api/files?key=<fileKey>`.
// Поиск и пагинация считает сервер (та же дверь, что у дашборда/аналитики). Обновляется на общий сигнал
// страницы «прогон/добавление завершено» (`shared/run-events`) — без перезагрузки, без опроса.
type Row = { id: string; createdAt: string; name?: unknown; kind?: unknown; fileKey?: unknown; size?: unknown } & Record<string, unknown>;
const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";
const TABLE = "storage";

export default function MainStorageClient({ lang, mode }: { lang: string; mode: "view" | "admin" }) {
  const t = storageStrings(lang);
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState(""); // текст в поле
  const [applied, setApplied] = useState(""); // что реально искали (кнопкой/Enter)
  const [loaded, setLoaded] = useState(false);
  // Состав колонок — из ЯДРА (закон вкладки базы, шаг 324): пока список жил в компоненте, закон
  // исполнялся, а владелец видел устаревшую таблицу. Колонок нет — таблица не рисуется, и это честно.
  const [columns, setColumns] = useState<TableColumn[]>([]);
  useEffect(() => {
    let alive = true;
    fetch(`${apiBase()}/core?select=tab:storage`, { cache: "no-store" })
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
  useEffect(() => onExternalRefresh(() => load(applied)), [load, applied]); // прогон из Telegram (сервер) — 308

  const runSearch = () => { const q = query.trim(); setApplied(q); load(q); };

  const del = async (id: string) => {
    if (!window.confirm(t.confirmDelete)) return;
    await fetch(`${apiBase()}/rows?table=${TABLE}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    load(applied);
  };

  const fmtSize = (n: unknown) => (typeof n === "number" && n > 0 ? `${Math.max(1, Math.round(n / 1024))} KB` : "—");
  const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(lang) : "—");

  return (
    <div className="space-y-3" data-entity-view="storage">
      {/* Ряд поиска: слева поиск, справа кнопка «Добавить запись» (только кокпит). Кнопка шлёт DOM-событие —
          саму модалку добавления с обрезкой показывает Кокпит-инструмент из дев-слоя (`_shared-v2`), закон 0
          не даёт публичной таблице тянуть внешний слой. */}
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
          <Button size="sm" onClick={() => window.dispatchEvent(new CustomEvent("fractera:storage-add"))}>
            {t.addRecord}
          </Button>
        ) : null}
      </div>

      {/* Результат явного поиска: сколько записей нашлось по применённому запросу. */}
      {applied ? <p className="text-xs text-muted-foreground">{t.found}: {rows.length}</p> : null}

      {/* Единый интерфейс таблиц (требование владельца): минимальная ширина колонки + горизонтальная
          прокрутка, страница в 10 записей, ячейка не выше четырёх строк. Превью и размер — свои типы
          ячеек этой вкладки, они передаются через `renderCell`, а не форкают таблицу. */}
      {loaded ? (
        <DataTable
          columns={columns}
          rows={rows}
          lang={lang}
          table={TABLE}
          strings={{ copy: t.copy, empty: t.empty, page: t.page, of: t.of }}
          renderCell={(r, c, v) => {
            // Превью и просмотр — общий рантайм-инструмент (`tools/media-viewer`): картинка показывается
            // миниатюрой, всё прочее — контейнером того же размера с подписью типа; клик открывает объект
            // в окне, размер которого выбирается по природе содержимого.
            if (c.key === "preview") return <MediaPreview fileKey={v} name={String(r.name ?? "")} />;
            if (c.key === "size") return <span className="tabular-nums">{fmtSize(v)}</span>;
            // Имя объекта бывает длинным (заголовок добытой статьи): показываем начало, полное — в подсказке.
            if (c.key === "name") {
              const s = String(v ?? "");
              return <span className="block truncate" title={s}>{s.length > 50 ? `${s.slice(0, 50)}…` : s || "—"}</span>;
            }
            return undefined;
          }}
          rowActions={mode === "admin" ? (r) => (
            <Button variant="outline" size="xs" onClick={() => del(r.id)}>{t.del}</Button>
          ) : undefined}
        />
      ) : null}
    </div>
  );
}
