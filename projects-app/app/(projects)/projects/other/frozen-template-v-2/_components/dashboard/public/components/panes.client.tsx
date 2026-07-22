"use client";

import { useEffect, useState, type ReactNode } from "react";
import { dashboardStrings } from "../../i18n";

// ПАНЕЛИ ДАШБОРДА — раскладка v1 один-в-один: ряд переключателей таблиц слева, кнопка «две таблицы /
// одна таблица» справа, ниже одна панель или две рядом. Выбор запоминается в браузере (localStorage),
// как и было.
//
// Панели приходят СВЕРХУ уже готовыми (children): каждая таблица — свой СЕРВЕРНЫЙ файл, прочитавший свои
// строки. Этот компонент только показывает нужную; он не знает, что внутри, и потому не мешает таблицам
// оставаться серверными.
export default function DashboardPanes({
  titles,
  lang,
  children,
}: {
  /** Подписи вкладок-переключателей, по одной на панель, в том же порядке. */
  titles: string[];
  lang: string;
  children: ReactNode[];
}) {
  const L = dashboardStrings(lang);
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(children.length > 1 ? 1 : 0);
  const [split, setSplit] = useState(false);
  const KEY = "dashboard-view:frozen-template-v-2";

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as { left?: number; right?: number; split?: boolean };
      const ok = (i?: number) => typeof i === "number" && i >= 0 && i < children.length;
      if (ok(s.left)) setLeft(s.left!);
      if (ok(s.right)) setRight(s.right!);
      setSplit(Boolean(s.split));
    } catch {
      /* выбор просто не восстановился — не повод ломать страницу */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children.length]);

  function persist(next: { left?: number; right?: number; split?: boolean }) {
    const state = { left, right, split, ...next };
    if (next.left !== undefined) setLeft(next.left);
    if (next.right !== undefined) setRight(next.right);
    if (next.split !== undefined) setSplit(next.split);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* не сохранилось */ }
  }

  const picker = (value: number, onPick: (i: number) => void) =>
    titles.length > 1 ? (
      <div className="inline-flex flex-wrap rounded-md border p-0.5">
        {titles.map((t, i) => (
          <button
            key={t + i}
            type="button"
            onClick={() => onPick(i)}
            className={`h-7 rounded px-2 text-xs ${i === value ? "bg-muted font-medium" : "text-muted-foreground hover:bg-accent"}`}
          >
            {t}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <div className="space-y-3" data-dashboard="panes">
      {children.length > 1 ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => persist({ split: !split })}
            className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
          >
            {split ? L.singleView : L.twoView}
          </button>
        </div>
      ) : null}

      <div className={split ? "grid gap-6 lg:grid-cols-2" : ""}>
        <div className="min-w-0 space-y-3">
          {picker(left, (i) => persist({ left: i }))}
          {children[left]}
        </div>
        {split ? (
          <div className="min-w-0 space-y-3">
            {picker(right, (i) => persist({ right: i }))}
            {children[right]}
          </div>
        ) : null}
      </div>
    </div>
  );
}
