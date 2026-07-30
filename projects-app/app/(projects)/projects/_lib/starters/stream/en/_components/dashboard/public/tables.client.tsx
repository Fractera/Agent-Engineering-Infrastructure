"use client";

import { useCallback, useEffect, useState } from "react";
import { Columns2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardTable } from "../table-config";
import { tablesFromCore, type CoreDashboardEntity } from "../from-core";
import { dashboardAdminStrings } from "../i18n";
import { DashboardPaneView } from "./components/pane.client";
import { useDashboardTableAdmin } from "./components/row-editing.client";

// КОНТЕЙНЕР ДАШБОРДА — перенос v1 `entities/dashboard/index.tsx` (шаг 298, «max copy»): ОДИН компонент, ДВЕ
// композиции, и РАЗДЕЛЁННЫЙ ВИД (одна таблица или две рядом), запомненный в браузере.
//
//   mode="view"  — публичное ядро: панель + таблица только для чтения (дашборд посетителя);
//   mode="admin" — то же ядро с админ-хромом в объявленных точках моста: добавить / править / удалить строку.
//
// Разделённый вид — презентация, а не привилегия: он живёт здесь, в контейнере, для обоих режимов, и выбор
// помнит localStorage — ровно как в v1. Контейнер — ЕДИНСТВЕННОЕ место, где встречаются вид и админ-хром
// (закон одной стрелы: admin импортирует view, никогда наоборот).
//
// ОТЛИЧИЕ ОТ v1, И ОНО ОДНО: конфиг таблиц не приходит пропсом из платформенного стора, а выводится из ЯДРА
// автоматизации (`api/core?select=tab:dashboard` → `from-core.ts`). Вёрстка, поведение, мост админа,
// типизированные ячейки и live-lookup перенесены один-в-один.
export type DashboardMode = "view" | "admin";

function AdminPane({
  automation, tables, value, onChange, lang,
}: { automation: string; tables: DashboardTable[]; value: string; onChange: (id: string) => void; lang: string }) {
  const table = tables.find((t) => t.id === value) ?? tables[0];
  const { bridge, modals } = useDashboardTableAdmin({ automation, table, lang });
  return (
    <>
      <DashboardPaneView automation={automation} tables={tables} value={value} onChange={onChange} admin={bridge} lang={lang} />
      {modals}
    </>
  );
}

/** Двери автоматизации и её адрес — из адреса страницы (папка знает себя только по URL). */
const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";
function automationFromPath(): string {
  if (typeof window === "undefined") return "";
  const p = window.location.pathname.split("?")[0].split("/").filter(Boolean);
  return p.length >= 3 && p[0] === "projects" ? `${p[1]}/${p[2]}` : "";
}

export function Dashboard({ lang, mode = "admin" }: { lang: string; mode?: DashboardMode }) {
  const L = dashboardAdminStrings(lang);
  const [tables, setTables] = useState<DashboardTable[]>([]);
  const automation = automationFromPath();
  const STORAGE = `dashboard-view:${automation}`;

  const [left, setLeft] = useState<string>("");
  const [right, setRight] = useState<string>("");
  const [split, setSplit] = useState(false);

  // Конфиг таблиц — из ЯДРА автоматизации (объявление колонок живёт там).
  useEffect(() => {
    let alive = true;
    fetch(`${apiBase()}/core?select=tab:dashboard`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { entities?: CoreDashboardEntity[] } | null) => {
        if (alive && d?.entities) setTables(tablesFromCore(d.entities, lang));
      })
      .catch(() => { /* нет двери — таблиц не будет */ });
    return () => { alive = false; };
  }, [lang]);

  useEffect(() => {
    if (!tables.length) return;
    const first = tables[0].id;
    const second = tables[1]?.id ?? first;
    try {
      const raw = localStorage.getItem(STORAGE);
      const s = raw ? (JSON.parse(raw) as { left?: string; right?: string; split?: boolean }) : null;
      const has = (id?: string) => !!id && tables.some((t) => t.id === id);
      setLeft(has(s?.left) ? (s!.left as string) : first);
      setRight(has(s?.right) ? (s!.right as string) : second);
      setSplit(Boolean(s?.split));
    } catch {
      setLeft(first);
      setRight(second);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.length]);

  // Открытые id таблиц из состояния выбора → шлём админ-врезке «строить таблицу N» (310): она рисует заявку
  // ТОЛЬКО для открытой таблицы. Связь без прямого пропа (public не импортит admin) — через событие.
  const announce = useCallback((s: { left?: string; right?: string; split?: boolean }) => {
    const ids = [s.left ?? left].concat((s.split ?? split) ? [s.right ?? right] : []).filter(Boolean) as string[];
    try { window.dispatchEvent(new CustomEvent("dashboard-select", { detail: { ids } })); } catch { /* no-op */ }
  }, [left, right, split]);

  const persist = useCallback((next: { left?: string; right?: string; split?: boolean }) => {
    const state = { left, right, split, ...next };
    if (next.left !== undefined) setLeft(next.left);
    if (next.right !== undefined) setRight(next.right);
    if (next.split !== undefined) setSplit(next.split);
    try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch { /* not persisted */ }
    announce(state);
  }, [left, right, split, STORAGE, announce]);

  // Начальный анонс, когда выбор загрузился (открыта первая таблица) — чтобы врезка сразу знала открытую.
  useEffect(() => {
    if (!left) return;
    try { window.dispatchEvent(new CustomEvent("dashboard-select", { detail: { ids: [left].concat(split ? [right] : []).filter(Boolean) } })); } catch { /* no-op */ }
  }, [left, right, split]);

  if (!tables.length) return <p className="text-sm text-muted-foreground">{L.empty}</p>;

  const Pane = ({ value, onChange }: { value: string; onChange: (id: string) => void }) =>
    mode === "admin" ? (
      <AdminPane automation={automation} tables={tables} value={value} onChange={onChange} lang={lang} />
    ) : (
      <DashboardPaneView automation={automation} tables={tables} value={value} onChange={onChange} lang={lang} />
    );

  return (
    <div className="space-y-3" data-entity-mode={mode}>
      {/* РАЗДЕЛЁННЫЙ ВИД: одна таблица или две рядом — кнопка справа, как в v1. */}
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => persist({ split: !split })}>
          {split ? <Square className="size-3.5" /> : <Columns2 className="size-3.5" />}
          {split ? L.singleView : L.twoView}
        </Button>
      </div>

      <div className={split ? "grid gap-6 lg:grid-cols-2" : ""}>
        <Pane value={left} onChange={(id) => persist({ left: id })} />
        {split ? <Pane value={right} onChange={(id) => persist({ right: id })} /> : null}
      </div>
    </div>
  );
}
