"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { financeStrings } from "../i18n";
import { categoryLabel } from "../../../_data/finance-categories";
import { onRunCompleted, onExternalRefresh } from "../../shared/run-events";

// РЕЕСТР ФИНАНСОВ — таблица движений денег (таблица `finance`), отдельная от заметок (паритет v1). Строки
// пишет узел `deliverDatabase`, когда `digitizeMoney` распознал трату/доход (фото чека или слова). Здесь их
// ВИДНО: тип, сумма, категории, описание, миниатюра чека. Обновляется без перезагрузки (прогон из Telegram
// — `onExternalRefresh`). Раньше вкладки не было → траты сохранялись, но были невидимы (жалоба владельца).
type Row = {
  id: string; createdAt: string;
  kind?: unknown; amount?: unknown; categories?: unknown; summary?: unknown; name?: unknown;
  storageIds?: unknown; date?: unknown;
} & Record<string, unknown>;

const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";
const TABLE = "finance";
const asIds = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export default function MainFinanceClient({ lang, mode }: { lang: string; mode: "view" | "admin" }) {
  const t = financeStrings(lang);
  const catLang: "ru" | "en" = (lang || "en").toLowerCase().startsWith("ru") ? "ru" : "en";
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    fetch(`${apiBase()}/rows?table=${TABLE}&limit=200`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { rows?: Row[] } | null) => { setRows(d?.rows ?? []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => onRunCompleted(() => load()), [load]);
  useEffect(() => onExternalRefresh(() => load()), [load]);

  const del = async (id: string) => {
    if (!window.confirm(t.confirmDelete)) return;
    await fetch(`${apiBase()}/rows?table=${TABLE}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    load();
  };

  const fmtDate = (r: Row) => {
    const iso = typeof r.date === "string" && r.date ? r.date : r.createdAt;
    return iso ? new Date(iso).toLocaleDateString(lang) : "—";
  };
  const cats = (v: unknown): string =>
    Array.isArray(v) ? v.map((c) => categoryLabel(String(c), catLang)).join(", ") : "—";

  // Итоги — простая сумма по типу (доход/расход).
  const totalIncome = rows.filter((r) => r.kind === "income").reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalExpense = rows.filter((r) => r.kind !== "income").reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return (
    <div className="space-y-3" data-entity-view="finance">
      <p className="text-xs text-muted-foreground">{t.subtitle}</p>

      {loaded && rows.length === 0 ? <p className="text-sm text-muted-foreground">{t.empty}</p> : null}

      {rows.length > 0 ? (
        <>
          <p className="text-xs text-muted-foreground">
            {t.total}: <span className="tabular-nums">+{totalIncome}</span> {t.totalIncome} · <span className="tabular-nums">−{totalExpense}</span> {t.totalExpense}
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-2 font-medium">{t.date}</th>
                  <th className="p-2 font-medium">{t.type}</th>
                  <th className="p-2 font-medium text-right">{t.amount}</th>
                  <th className="p-2 font-medium">{t.categories}</th>
                  <th className="p-2 font-medium">{t.summary}</th>
                  <th className="p-2 font-medium">{t.receipt}</th>
                  {mode === "admin" ? <th className="p-2" /> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const income = r.kind === "income";
                  const ids = asIds(r.storageIds);
                  return (
                    <tr key={r.id} className="border-b align-top last:border-0">
                      <td className="p-2 tabular-nums">{fmtDate(r)}</td>
                      <td className="p-2">
                        <span className={income ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                          {income ? t.income : t.expense}
                        </span>
                      </td>
                      <td className="p-2 text-right tabular-nums font-medium">
                        {income ? "+" : "−"}{r.amount != null ? String(r.amount) : "?"}
                      </td>
                      <td className="p-2">{cats(r.categories)}</td>
                      <td className="p-2 max-w-xs">{String(r.summary ?? r.name ?? "—")}</td>
                      <td className="p-2">
                        {ids.length ? (
                          <a
                            href={`${apiBase()}/files?key=${encodeURIComponent(ids[0])}`}
                            target="_blank" rel="noreferrer"
                            className="inline-block"
                          >
                            <img
                              src={`${apiBase()}/files?key=${encodeURIComponent(ids[0])}`}
                              alt={t.receipt}
                              className="h-12 w-12 rounded object-cover ring-1 ring-border"
                            />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      {mode === "admin" ? (
                        <td className="p-2 text-right">
                          <Button variant="outline" size="xs" onClick={() => del(r.id)}>{t.del}</Button>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
