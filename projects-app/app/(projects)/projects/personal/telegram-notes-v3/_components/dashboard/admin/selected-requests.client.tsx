"use client";

import { useEffect, useState } from "react";
import { DevBuildWithAi } from "../../shared/dev-slot.client";

// ЗАЯВКА «СТРОИТЬ ТАБЛИЦУ N С ИИ» — ТОЛЬКО ДЛЯ ОТКРЫТОЙ ТАБЛИЦЫ (шаг 310, баг владельца). Раньше при
// нескольких таблицах врезка показывалась для КАЖДОЙ сразу (стопкой) — открыв таблицу 2, владелец видел
// «строить таблицу 1» + «строить таблицу 2» + «строить дашборд». Правильно: врезка per-table идёт только для
// той таблицы, что сейчас открыта в контейнере (в разделённом виде — для обеих открытых). Выбор живёт в
// `tables.client` (`left`/`right`/`split`); связь без прямого пропа — через localStorage (начальное чтение) +
// событие `dashboard-select`, которое `tables.client` шлёт при каждой смене. Общий тег «строить дашборд»
// (вкладку целиком) рисуется отдельно и от выбора не зависит.
export type EntityLite = { cuid: string; tableId: string; title: string; pending?: string };

function automationFromPath(): string {
  if (typeof window === "undefined") return "";
  const p = window.location.pathname.split("?")[0].split("/").filter(Boolean);
  return p.length >= 3 && p[0] === "projects" ? `${p[1]}/${p[2]}` : "";
}

/** Открытые id таблиц из персиста выбора (та же форма, что пишет `tables.client`). */
function openIdsFromStorage(automation: string): string[] {
  try {
    const raw = localStorage.getItem(`dashboard-view:${automation}`);
    if (!raw) return [];
    const s = JSON.parse(raw) as { left?: string; right?: string; split?: boolean };
    const ids = [s.left].concat(s.split ? [s.right] : []);
    return ids.filter((x): x is string => Boolean(x));
  } catch {
    return [];
  }
}

export function SelectedEntityRequests({ entities, lang }: { entities: EntityLite[]; lang: string }) {
  const [openIds, setOpenIds] = useState<string[]>([]);

  useEffect(() => {
    const automation = automationFromPath();
    const sync = () => setOpenIds(openIdsFromStorage(automation));
    sync(); // начальное состояние из персиста
    const onSelect = (e: Event) => {
      const d = (e as CustomEvent<{ ids?: string[] }>).detail;
      if (d && Array.isArray(d.ids)) setOpenIds(d.ids.filter(Boolean));
      else sync();
    };
    window.addEventListener("dashboard-select", onSelect);
    return () => window.removeEventListener("dashboard-select", onSelect);
  }, []);

  // Пока выбор не прочитан — показываем первую таблицу (как показывает и контейнер по умолчанию), чтобы не
  // мигать пустотой; дальше событие/персист уточнят.
  const shown = openIds.length ? entities.filter((e) => openIds.includes(e.tableId)) : entities.slice(0, 1);

  return (
    <>
      {shown.map((e) => (
        <DevBuildWithAi
          key={e.cuid}
          target={{ object: "entity", tab: "dashboard", cuid: e.cuid }}
          name={e.title}
          pending={e.pending}
          lang={lang}
        />
      ))}
    </>
  );
}
