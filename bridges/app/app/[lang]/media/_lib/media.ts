// Серверное чтение медиатеки (шаг 501, Ф2, партия 4).
//
// ЧЕМ ЭТА ПОВЕРХНОСТЬ ОТЛИЧАЕТСЯ ОТ ОСТАЛЬНЫХ. Медиатека — единственный раздел,
// который ходит НЕ к панели, а прямо в слой данных `:3300`. Так и осталось для
// всего, что делает браузер: загрузка файла, обрезка, монтаж, удаление, правка
// подписей — они идут туда напрямую с cookie посетителя, как раньше.
//
// Но СПИСОК теперь читает сервер, и по другой двери: по внутреннему секрету
// `x-data-secret` через петлю `localhost:3300`. Отсюда два следствия:
//   • список приезжает внутри HTML, без спиннера и без запроса из браузера;
//   • адреса файлов для браузера обязаны быть ПУБЛИЧНЫМИ (`data.<домен>` или
//     `<ip>:3300`), а не петлёй — их считает `publicDataUrl()`. Подставить сюда
//     `localhost` значило бы отдать браузеру ссылку на его собственную машину;
//     этот класс ошибки в проекте уже стоил времени (`publicDataUrl` для этого и
//     написан).

import { publicDataUrl } from "@/lib/public-data-url";

const LOOPBACK = process.env.DATA_SERVICE_URL ?? "http://localhost:3300";
const DATA_SECRET = process.env.DATA_SECRET ?? "";

export type MediaItem = {
  id: string;
  name: string;
  title: string;
  description: string;
  url: string;
  mime_type: string;
  extension: string;
  crop_mode: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  storage_key: string;
  created_at: string;
};

export type MediaList =
  | { ok: true; items: MediaItem[]; publicBase: string; baseReason?: string }
  | { ok: false; reason: string };

export async function listMedia(): Promise<MediaList> {
  const base = publicDataUrl();

  try {
    const res = await fetch(`${LOOPBACK}/media/`, {
      headers: DATA_SECRET ? { "x-data-secret": DATA_SECRET } : {},
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, reason: `data service: ${res.status}` };
    const data = await res.json();
    return {
      ok: true,
      items: (data.items ?? []) as MediaItem[],
      publicBase: base.url,
      baseReason: base.reason,
    };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

// Отбор по запросу — на сервере. Старая панель фильтровала уже загруженный
// массив в браузере; на странице тот же отбор идёт до отдачи HTML, поэтому поиск
// работает и без JS, а адрес с запросом можно переслать.
export function filterMedia(items: MediaItem[], query: string, publicBase: string): MediaItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  return items
    .filter((i) =>
      i.name.toLowerCase().includes(q) ||
      (i.title ?? "").toLowerCase().includes(q) ||
      (i.description ?? "").toLowerCase().includes(q) ||
      `${publicBase}/media/${i.id}/file`.toLowerCase().includes(q))
    // Совпадение с начала названия — выше: тот же порядок, что был в панели.
    .sort((a, b) => {
      const al = (a.title || a.name).toLowerCase();
      const bl = (b.title || b.name).toLowerCase();
      const as = al.startsWith(q);
      const bs = bl.startsWith(q);
      if (as && !bs) return -1;
      if (!as && bs) return 1;
      return al.localeCompare(bl);
    });
}

export const fileHref = (base: string, id: string, version?: number) =>
  `${base}/media/${id}/file${version ? `?v=${version}` : ""}`;
