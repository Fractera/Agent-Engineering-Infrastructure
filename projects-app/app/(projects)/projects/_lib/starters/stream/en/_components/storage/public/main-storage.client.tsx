"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { storageStrings } from "../i18n";
import { onRunCompleted } from "../../shared/run-events";

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

      {loaded && rows.length === 0 ? <p className="text-sm text-muted-foreground">{t.empty}</p> : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2 font-medium">{t.id}</th>
                <th className="p-2 font-medium">{t.preview}</th>
                <th className="p-2 font-medium">{t.name}</th>
                <th className="p-2 font-medium">{t.kind}</th>
                <th className="p-2 font-medium">{t.size}</th>
                <th className="p-2 font-medium">{t.added}</th>
                {mode === "admin" ? <th className="p-2" /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-2">
                    <IdCell id={r.id} copyLabel={t.copy} />
                  </td>
                  <td className="p-2">
                    {r.fileKey ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${apiBase()}/files?key=${encodeURIComponent(String(r.fileKey))}`}
                        alt=""
                        className="h-12 w-12 rounded border object-cover"
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-2">{String(r.name ?? "—")}</td>
                  <td className="p-2">{String(r.kind ?? "—")}</td>
                  <td className="p-2 tabular-nums">{fmtSize(r.size)}</td>
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
