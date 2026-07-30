"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { glossaryStrings } from "../i18n";
import { onRunCompleted, onExternalRefresh } from "../../shared/run-events";

// ВКЛАДКА «ГЛОССАРИЙ» — пользовательские алиасы (таблица `glossary`). Показывает ручные И авто-добавленные
// (source-бейдж), обновляется без перезагрузки (авто-добавление из Telegram — onExternalRefresh).
// Пишет/удаляет строки общей дверью `api/rows` (PUT добавляет, DELETE удаляет).
type Row = { id: string; createdAt: string; term?: unknown; meaning?: unknown; source?: unknown } & Record<string, unknown>;
const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";
const TABLE = "glossary";

export default function MainGlossaryClient({ lang }: { lang: string }) {
  const t = glossaryStrings(lang);
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [term, setTerm] = useState("");
  const [meaning, setMeaning] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch(`${apiBase()}/rows?table=${TABLE}&limit=500`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { rows?: Row[] } | null) => { setRows(d?.rows ?? []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => onRunCompleted(() => load()), [load]);
  useEffect(() => onExternalRefresh(() => load()), [load]);

  const add = async () => {
    const T = term.trim(), M = meaning.trim();
    if (!T || !M) return;
    setBusy(true);
    try {
      await fetch(`${apiBase()}/rows`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ table: TABLE, values: { term: T, meaning: M, source: "manual" } }),
      });
      setTerm(""); setMeaning(""); load();
    } finally { setBusy(false); }
  };

  const del = async (id: string) => {
    if (!window.confirm(t.confirmDelete)) return;
    await fetch(`${apiBase()}/rows?table=${TABLE}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-3" data-entity-view="glossary">
      <p className="text-xs text-muted-foreground">{t.subtitle}</p>

      {/* Добавление алиаса */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input className="h-8 flex-1" placeholder={t.termPh} value={term} disabled={busy}
          onChange={(e) => setTerm(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void add(); }} />
        <span className="hidden text-muted-foreground sm:inline">→</span>
        <Input className="h-8 flex-1" placeholder={t.meaningPh} value={meaning} disabled={busy}
          onChange={(e) => setMeaning(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void add(); }} />
        <Button size="sm" className="gap-1" onClick={() => void add()} disabled={busy || !term.trim() || !meaning.trim()}>
          <Plus className="size-4" /> {t.add}
        </Button>
      </div>

      {loaded && rows.length === 0 ? <p className="text-sm text-muted-foreground">{t.empty}</p> : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2 font-medium">{t.term}</th>
                <th className="p-2 font-medium">{t.meaning}</th>
                <th className="p-2 font-medium">{t.source}</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b align-top last:border-0">
                  <td className="p-2 font-medium">{String(r.term ?? "—")}</td>
                  <td className="p-2">{String(r.meaning ?? "—")}</td>
                  <td className="p-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {r.source === "auto" ? t.auto : t.manual}
                    </span>
                  </td>
                  <td className="p-2 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t.del} onClick={() => del(r.id)}>
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
