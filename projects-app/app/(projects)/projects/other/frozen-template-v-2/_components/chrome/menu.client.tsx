"use client";

import { useState } from "react";
import { chromeStrings } from "./i18n";
import { HamburgerIcon, DragHandleIcon, EyeIcon, EyeOffIcon } from "./icons";

// ГАМБУРГЕР-МЕНЮ (админ) — инструменты над контейнерами автоматизации.
// В этой итерации переключатель видимости ПИШЕТ В ЯДРО: presence вкладки через собственную дверь
// api/patch (hidden = absent, visible = expanded). Оба surface читают одно ядро → отражают сразу.
// Drag-and-drop — рукоятка рисуется и переставляет строки ЛОКАЛЬНО (визуальная заготовка); сохранение
// порядка появится отдельным op `reorder` (будущий шаг), пока не персистится.
type TabRow = { name: string; presence: "absent" | "collapsed" | "expanded" };

export default function Menu({ lang, tabs, publicHref }: { lang: string; tabs: TabRow[]; publicHref: string }) {
  const L = chromeStrings(lang);
  const [rows, setRows] = useState<TabRow[]>(tabs);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggleVisibility(name: string, presence: TabRow["presence"]) {
    const next = presence === "absent" ? "expanded" : "absent";
    setBusy(name);
    try {
      const apiBase = location.pathname.replace(/\/+$/, "") + "/api";
      const r = await fetch(`${apiBase}/patch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: { object: "tab", name }, set: { presence: next } }),
      });
      if (!r.ok) throw new Error(String(r.status));
      // the server re-renders the tab area from the changed core — reload so both the menu and the page
      // below reflect the new state (this iteration's proof of the chrome ↔ core round-trip)
      location.reload();
    } catch {
      setBusy(null);
    }
  }

  // LOCAL-ONLY reordering (not persisted this iteration) — the drag affordance for the future `reorder` op.
  function onDrop(target: number) {
    if (dragIndex === null || dragIndex === target) return;
    setRows((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(dragIndex, 1);
      copy.splice(target, 0, moved);
      return copy;
    });
    setDragIndex(null);
  }

  return (
    <details data-chrome="menu" className="relative">
      <summary className="flex cursor-pointer list-none items-center rounded-md border px-2 py-1.5 text-muted-foreground hover:text-foreground">
        <HamburgerIcon className="size-4" />
      </summary>

      <div className="absolute right-0 z-20 mt-2 w-72 rounded-lg border bg-background p-2 shadow-lg">
        <a href={publicHref} className="block rounded-md px-2 py-1.5 text-sm hover:bg-muted">
          {L.publicPage}
        </a>

        <div className="mt-2 border-t pt-2">
          <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{L.containers}</p>
          <ul className="space-y-0.5">
            {rows.map((tab, i) => {
              const isVisible = tab.presence !== "absent";
              return (
                <li
                  key={tab.name}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(i)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                >
                  <span className="cursor-grab text-muted-foreground" title={L.dragHint}>
                    <DragHandleIcon className="size-4" />
                  </span>
                  <span className="flex-1 truncate text-sm capitalize">{tab.name}</span>
                  <button
                    type="button"
                    onClick={() => toggleVisibility(tab.name, tab.presence)}
                    disabled={busy === tab.name}
                    aria-label={isVisible ? L.visible : L.hidden}
                    title={isVisible ? L.visible : L.hidden}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    {isVisible ? <EyeIcon className="size-4" /> : <EyeOffIcon className="size-4" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </details>
  );
}
