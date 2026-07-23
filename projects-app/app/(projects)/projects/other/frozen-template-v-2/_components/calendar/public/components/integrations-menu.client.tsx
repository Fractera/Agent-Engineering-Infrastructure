"use client";

import { useEffect, useState } from "react";
import { INTEGRATION_ICONS } from "../../../chrome/icons";
import type { Surface } from "../../../surface";
import { pick } from "../../../shared/localized";
import KeysModal from "../../../shared/keys-modal.client";
import { keysOf } from "../../../channels";
import { missingKeysOf, type Integration } from "../../integrations";
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
//
// ГЕЙТ КЛЮЧЕЙ (шаг 293) — тот же, что у каналов в главном меню, и той же формой: интеграция, чьи ключи
// не введены, ПРИГЛУШЕНА, а клик по ней открывает ввод ключей. Отменил ввод — галочка не поставилась.
// Второй реализации ввода ключей в продукте нет.
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
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [asking, setAsking] = useState<Integration | null>(null);

  const declared = [...new Set(integrations.flatMap((i) => i.envKeys))];
  useEffect(() => {
    if (declared.length === 0) return;
    let alive = true;
    void (async () => {
      try {
        const apiBase = location.pathname.replace(/\/+$/, "") + "/api";
        const r = await fetch(`${apiBase}/env?keys=${encodeURIComponent(declared.join(","))}`, { cache: "no-store" });
        if (!r.ok) return;
        const d = (await r.json()) as { present: Record<string, boolean> };
        if (alive) setPresent(d.present ?? {});
      } catch {
        /* не смогли спросить — считаем ключи незаданными: безопасная сторона ошибки */
      }
    })();
    return () => { alive = false; };
  }, [declared.join(",")]);

  if (list.length === 0) return null;

  async function write(next: Integration[]) {
    setList(next);
    setBusy(true);
    try {
      const apiBase = location.pathname.replace(/\/+$/, "") + "/api";
      const r = await fetch(`${apiBase}/patch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: { object: "entity", tab: "calendar", cuid }, set: { data: { integrations: next } } }),
      });
      if (!r.ok) throw new Error(String(r.status));
      location.reload(); // иконки на строках выводятся из этого же списка — страница согласуется целиком
    } catch {
      setList(list); // ядро не приняло правку — возвращаем то, что в нём осталось
      setBusy(false);
    }
  }

  function toggle(i: Integration) {
    const next = list.map((x) => (x.key === i.key ? { ...x, enabled: !x.enabled } : x));
    if (i.enabled) return void write(next); // выключение ключей не требует
    if (missingKeysOf(i, present).length) return setAsking(i); // сначала ключи, потом галочка
    void write(next);
  }

  return (
    <>
      <details className="relative" data-calendar="integrations-menu">
        <summary className="flex cursor-pointer list-none items-center rounded-md border px-2 py-1 text-xs hover:bg-accent">
          {L.integrations}
        </summary>
        <div className="absolute right-0 z-20 mt-1 w-72 rounded-md border bg-background p-1 text-sm shadow-md">
          {list.map((i) => {
            const Icon = INTEGRATION_ICONS[i.key];
            const missing = missingKeysOf(i, present);
            return (
              <label
                key={i.key}
                data-integration-row={i.key}
                data-ready={missing.length ? "no" : "yes"}
                className={`flex items-center gap-2 rounded-sm px-2 py-1.5 ${editable ? "cursor-pointer hover:bg-accent" : "opacity-70"} ${missing.length ? "opacity-50" : ""}`}
              >
                <input
                  type="checkbox"
                  className="size-3.5"
                  checked={i.enabled}
                  disabled={!editable || busy}
                  onChange={() => toggle(i)}
                />
                {Icon ? <Icon className="size-3.5 shrink-0 text-muted-foreground" /> : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{pick(i.label, lang) || i.key}</span>
                  {missing.length ? <span className="block truncate text-[10px] text-muted-foreground">{L.keysMissing}</span> : null}
                </span>
              </label>
            );
          })}
          {!editable ? <p className="px-2 py-1 text-xs text-muted-foreground">{L.viewOnly}</p> : null}
        </div>
      </details>

      {/* Та же форма ключей, что и в главном меню. Отмена — галочка НЕ ставится, в ядро ничего не идёт. */}
      <KeysModal
        open={Boolean(asking)}
        channelName={asking ? pick(asking.label, lang) || asking.key : ""}
        keys={asking ? keysOf(asking.envKeys) : []}
        present={present}
        lang={lang}
        onCancel={() => setAsking(null)}
        onSaved={() => {
          const i = asking!;
          setPresent((p) => ({ ...p, ...Object.fromEntries(i.envKeys.map((k) => [k, true])) }));
          setAsking(null);
          void write(list.map((x) => (x.key === i.key ? { ...x, enabled: true } : x)));
        }}
      />
    </>
  );
}
