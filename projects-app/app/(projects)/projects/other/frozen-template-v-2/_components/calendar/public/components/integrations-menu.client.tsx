"use client";

import { useState } from "react";
import { INTEGRATION_ICONS } from "../../../chrome/icons";
import type { Surface } from "../../../surface";
import { pick } from "../../../shared/localized";
import type { Integration } from "../../integrations";
import { calendarStrings } from "../../i18n";

// ВЫПАДАЮЩИЙ СПИСОК ИНТЕГРАЦИЙ — справа в шапке календаря, ровно как выбор колонок у таблицы дашборда
// (`dashboard/public/components/data-table.client.tsx`): та же раскрывашка на <details>, те же чекбоксы.
// Одинаковые вещи должны выглядеть и работать одинаково — владелец не должен угадывать, что это меню
// такое же.
//
// РАЗНИЦА С ТАБЛИЦЕЙ ОДНА, И ОНА ПРИНЦИПИАЛЬНАЯ. У таблицы галочка — вид: что показать НА ЭКРАНЕ, и
// живёт она в браузере. Здесь галочка — ЗАКОН: какие каналы у этого календаря вообще возможны, и она
// пишется В ЯДРО. Поэтому переключать её может только владелец; посетителю витрины список виден, но
// чекбоксы неактивны.
export default function IntegrationsMenu({
  cuid,
  integrations,
  surface,
  lang,
}: {
  cuid: string;
  integrations: Integration[];
  surface: Surface;
  lang: string;
}) {
  const L = calendarStrings(lang);
  const editable = surface === "admin";
  const [list, setList] = useState(integrations);
  const [busy, setBusy] = useState(false);

  if (list.length === 0) return null;

  async function toggle(key: string) {
    const next = list.map((i) => (i.key === key ? { ...i, enabled: !i.enabled } : i));
    setList(next); // сначала показываем — ожидание записи не должно выглядеть как «кнопка не нажалась»
    setBusy(true);
    try {
      const apiBase = location.pathname.replace(/\/+$/, "") + "/api";
      const r = await fetch(`${apiBase}/patch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address: { object: "entity", tab: "calendar", cuid },
          set: { data: { integrations: next } },
        }),
      });
      if (!r.ok) throw new Error(String(r.status));
      // Иконки на строках выводятся из этого же списка — пусть страница согласуется целиком.
      location.reload();
    } catch {
      setList(list); // ядро не приняло правку — возвращаем то, что в нём осталось
      setBusy(false);
    }
  }

  return (
    <details className="relative" data-calendar="integrations-menu">
      <summary className="flex cursor-pointer list-none items-center rounded-md border px-2 py-1 text-xs hover:bg-accent">
        {L.integrations}
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-64 rounded-md border bg-background p-1 text-sm shadow-md">
        {list.map((i) => {
          const Icon = INTEGRATION_ICONS[i.key];
          return (
            <label
              key={i.key}
              className={`flex items-center gap-2 rounded-sm px-2 py-1.5 ${editable ? "cursor-pointer hover:bg-accent" : "opacity-70"}`}
            >
              <input
                type="checkbox"
                className="size-3.5"
                checked={i.enabled}
                disabled={!editable || busy}
                onChange={() => void toggle(i.key)}
              />
              {Icon ? <Icon className="size-3.5 shrink-0 text-muted-foreground" /> : null}
              <span className="truncate">{pick(i.label, lang) || i.key}</span>
            </label>
          );
        })}
        {!editable ? <p className="px-2 py-1 text-xs text-muted-foreground">{L.viewOnly}</p> : null}
      </div>
    </details>
  );
}
