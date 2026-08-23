// Серверное чтение состояния каналов связи (шаг 501, Ф2, партия 11).
//
// Служба каналов живёт на :3500 в петле. Страница спрашивает её ДО отдачи HTML,
// поэтому видно без JS: жива ли служба, сохранён ли токен бота, узнаёт ли его сам
// Telegram, привязана ли учётная запись.
//
// «Служба не запущена», «токен не сохранён» и «токен сохранён, но Telegram его не
// узнаёт» — ТРИ РАЗНЫХ состояния, и страница обязана их различать: лечение у них
// тоже разное.

import { headers } from "next/headers";

const ADMIN = process.env.ADMIN_INTERNAL_URL ?? "http://127.0.0.1:3002";

export type TelegramState = {
  configured: boolean;
  reachable: boolean;
  bot: string | null;
  chatId: string | null;
  who: string | null;
  enabled: boolean;
  /** Шаг расписания в секундах. 0 — выключено; поле молодое, поэтому необязательное. */
  tickSeconds?: number;
};

export type ChannelsState = { available: boolean; telegram: TelegramState | null };

export async function readChannels(): Promise<ChannelsState> {
  const cookie = (await headers()).get("cookie") ?? "";
  try {
    const r = await fetch(`${ADMIN}/api/channels`, {
      headers: { cookie },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return { available: false, telegram: null };
    const d = await r.json();
    return { available: d.available === true, telegram: (d.telegram ?? null) as TelegramState | null };
  } catch {
    return { available: false, telegram: null };
  }
}
