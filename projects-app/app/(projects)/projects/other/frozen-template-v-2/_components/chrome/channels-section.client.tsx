"use client";

import { useEffect, useState } from "react";
import Switch from "./switch.client";
import { chromeStrings } from "./i18n";
import KeysModal from "../shared/keys-modal.client";
import { keysOf, requiredOf, type ChannelKey } from "../channels";

// РАЗДЕЛ «КАНАЛЫ» ГЛАВНОГО МЕНЮ (шаг 293) — второй список под разделами: чем автоматизация СЛУШАЕТ и
// чем ОТВЕЧАЕТ. Переключатель здесь не косметика: включение канала = РАСКРЫТИЕ его узла, то есть готовая
// операция двери `op:"visibility"` (шаг 270) со всеми её законами — последний видимый вход и последний
// видимый выход скрыть нельзя, и дверь честно об этом откажет.
//
// ГЕЙТ КЛЮЧЕЙ (требование владельца). Канал, объявивший `envKeys`, включается ТОЛЬКО когда они введены.
// Нет — открывается форма ключей; закрыл её, не заполнив, — переключатель возвращается назад, и в ядро
// НЕ УХОДИТ НИ ОДНОЙ ЗАПИСИ. Порядок именно такой: сначала ключи, потом раскрытие. Раскрыть канал, к
// которому нельзя подключиться, значит соврать на холсте.
//
// ТРИ СОСТОЯНИЯ СТРОКИ — это три РАЗНЫЕ причины, почему канал не работает, и их нельзя схлопывать:
//   1. нет ключей   — переключатель приглушён, клик открывает форму;
//   2. нет функции  — ключи есть, узел законен, но его `_lib/nodes/<имя>.ts` ещё не написан. Включить
//                     можно, но прогон честно скажет «функция не зарегистрирована». Без этой пометки
//                     владелец включил бы канал и получил непонятный отказ на прогоне;
//   3. работает     — есть и ключи, и функция.
export type ChannelRow = {
  cuid: string;
  name: string;
  ioType: string;
  group: "input" | "output";
  state: "visible" | "hidden";
  envKeys: string[];
  /** Зарегистрирована ли функция узла в `_lib/nodes/index.ts` (считается на сервере). */
  hasFunction: boolean;
};

export default function ChannelsSection({ channels, lang }: { channels: ChannelRow[]; lang: string }) {
  const L = chromeStrings(lang);
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [asking, setAsking] = useState<{ row: ChannelRow; keys: ChannelKey[] } | null>(null);

  // Присутствие ключей спрашивается ОДНИМ запросом на всё меню, а не по запросу на канал.
  const declared = [...new Set(channels.flatMap((c) => c.envKeys))];
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
        /* не смогли спросить — считаем ключи незаданными: это безопасная сторона ошибки */
      }
    })();
    return () => { alive = false; };
  }, [declared.join(",")]);

  const missingOf = (row: ChannelRow): string[] => requiredOf(keysOf(row.envKeys)).filter((k) => !present[k]);

  async function setVisibility(row: ChannelRow, next: "visible" | "hidden") {
    setBusy(row.cuid);
    try {
      const apiBase = location.pathname.replace(/\/+$/, "") + "/api";
      const r = await fetch(`${apiBase}/patch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "visibility", address: { object: "node", cuid: row.cuid }, state: next }),
      });
      if (!r.ok) throw new Error(String(r.status));
      location.reload(); // холст, диаграмма и разделы читают то же ядро — пусть страница согласуется целиком
    } catch {
      setBusy(null);
    }
  }

  function toggle(row: ChannelRow) {
    if (row.state === "visible") return void setVisibility(row, "hidden"); // выключение ключей не требует
    const missing = missingOf(row);
    if (missing.length) return setAsking({ row, keys: keysOf(row.envKeys) }); // сначала ключи
    void setVisibility(row, "visible");
  }

  if (channels.length === 0) return null;

  const rowsOf = (group: "input" | "output") => channels.filter((c) => c.group === group);

  return (
    <>
      <div className="px-2 py-1.5 text-xs font-normal text-muted-foreground">{L.channelsHeading}</div>
      {(["input", "output"] as const).map((group) => (
        <div key={group}>
          <div className="px-2 pt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            {group === "input" ? L.channelsIn : L.channelsOut}
          </div>
          {rowsOf(group).map((row) => {
            const missing = missingOf(row);
            const note = missing.length ? L.channelNeedsKeys : !row.hasFunction ? L.channelNoFunction : null;
            return (
              <div key={row.cuid} className="flex items-center gap-2 rounded-sm px-2 py-1.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{row.name}</span>
                  {note ? <span className="block truncate text-[10px] text-muted-foreground">{note}</span> : null}
                </span>
                <Switch
                  checked={row.state === "visible"}
                  disabled={busy === row.cuid}
                  ariaLabel={row.name}
                  onCheckedChange={() => toggle(row)}
                />
              </div>
            );
          })}
        </div>
      ))}

      {/* ЗАКОН ОТМЕНЫ: закрыли форму — состояние не изменилось нигде. Успех — записываем присутствие и
          ТОЛЬКО ТОГДА раскрываем канал. */}
      <KeysModal
        open={Boolean(asking)}
        channelName={asking?.row.name ?? ""}
        keys={asking?.keys ?? []}
        present={present}
        lang={lang}
        onCancel={() => setAsking(null)}
        onSaved={() => {
          const row = asking!.row;
          setPresent((p) => ({ ...p, ...Object.fromEntries(row.envKeys.map((k) => [k, true])) }));
          setAsking(null);
          void setVisibility(row, "visible");
        }}
      />
    </>
  );
}
