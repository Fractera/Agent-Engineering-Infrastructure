"use client";

import { useState } from "react";
import Switch from "../../../chrome/switch.client";
import { PERIODS, type CronSettings } from "../../schedule";
import { cronStrings } from "../../i18n";

// ФОРМА РАСПИСАНИЯ — единственное место, где такт МЕНЯЮТ. Пишет прямо в ядро дверью `api/patch` по
// адресу сущности (`entity.data` уже в белом списке `WRITABLE` — своей двери расписанию не нужно).
//
// После записи страница перечитывается: такт читают и полоса-пульс, и сторож календаря, и они обязаны
// увидеть новое значение одновременно. Дверь адресуется относительно текущего пути (закон 0).
export default function ScheduleForm({
  cuid,
  settings,
  lang,
}: {
  cuid: string;
  settings: CronSettings;
  lang: string;
}) {
  const L = cronStrings(lang);
  const [busy, setBusy] = useState(false);

  async function save(set: Record<string, unknown>) {
    setBusy(true);
    try {
      const apiBase = location.pathname.replace(/\/+$/, "") + "/api";
      const r = await fetch(`${apiBase}/patch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: { object: "entity", tab: "cron", cuid }, set: { data: { ...set } } }),
      });
      if (!r.ok) throw new Error(String(r.status));
      location.reload(); // такт читает не только этот раздел — пусть страница согласуется целиком
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3 text-sm">
        <Switch
          checked={settings.enabled}
          disabled={busy}
          ariaLabel={L.enabled}
          onCheckedChange={(v) => void save({ ...settings, enabled: v })}
        />
        <span>{L.enabled}</span>
      </label>

      <label className="flex flex-wrap items-center gap-2 text-sm">
        <span>{L.period}</span>
        <select
          value={settings.everyMinutes}
          disabled={busy}
          onChange={(e) => void save({ ...settings, everyMinutes: Number(e.target.value) })}
          className="h-8 rounded-md border bg-transparent px-2 text-sm outline-none focus:ring-1 focus:ring-primary"
        >
          {PERIODS.map((p) => (
            <option key={p} value={p}>
              {p} {L.minutes}
            </option>
          ))}
        </select>
        {busy ? <span className="text-xs text-muted-foreground">{L.saving}</span> : null}
      </label>
    </div>
  );
}
