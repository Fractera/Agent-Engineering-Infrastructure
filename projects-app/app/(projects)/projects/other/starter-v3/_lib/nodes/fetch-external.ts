// СРЕДИННЫЙ УЗЕЛ — ДОБЫЧА ПРЕДМЕТА СНАРУЖИ (шаг 311.7). Первый узел экспоната: человек назвал ПРЕДМЕТ,
// данных о нём в сообщении нет — узел приносит их из открытого энциклопедического источника.
//
// ПРЕДМЕТ ЗАДАЁТ ПОЛЬЗОВАТЕЛЬ, УЗЕЛ ЕГО НЕ ЗНАЕТ. Башня, кит, двигатель, гриб — узлу всё равно: он
// работает с ИМЕНЕМ предмета, а не с предметной областью. Тест нейтральности: замени «предмет» на
// заявку, деталь, пациента — файл не меняется ни строкой.
//
// ИСТОЧНИК БЕЗ КЛЮЧА (требование владельца: развернул — пользуешься). Wikipedia/Wikimedia REST: открытый
// API, регистрация не нужна, контент под свободной лицензией — значит узел работает на свежем сервере,
// где не введено ещё ни одного ключа, и не тащит в продукт чужой стоковый контент.
//
// ЧЕСТНЫЕ ИСХОДЫ (прогон не роняем — отсутствие сведений не катастрофа):
//   нашли          → `subject` (имя, описание, изображение, координаты, дата) + текст для развозки;
//   не нашли       → `subjectMissing` с именем: маршрут ответит «ничего не нашлось про X»;
//   сеть отказала  → `subjectError`, поток идёт дальше, факт не выдумываем.
// Имя `fetchExternal` — глагол ФОРМЫ (не существительное бизнеса), см. `kind.transform.md`.
import type { NodeCtx } from "../executor";
import { servesAnyClass } from "../message";

const API = "https://en.wikipedia.org/w/api.php";
// 🔒 КОНТАКТ В USER-AGENT ОБЯЗАТЕЛЕН (доказано живьём 311.7): Wikimedia отвечает 403 на обращение без
// адреса в UA — это их политика, а не наш баг. Без контакта узел молча деградировал бы в «не нашлось».
const UA = "Fractera-Automation/1.0 (+https://fractera.ai; open encyclopedic lookup)";

/** Имя предмета из запроса: срезаем вежливую обёртку, остальное — как написал человек. */
function subjectNameOf(text: string): string {
  return text
    .replace(/^\s*(please\s+)?(show|find|look up|search for|get|tell me about|what is|what are|who is|who was)\s+/i, "")
    .replace(/^(me\s+)?(a|an|the)\s+/i, "")
    .replace(/[?!.]+\s*$/, "")
    .trim();
}

type Subject = {
  name: string;
  description: string;
  imageUrl: string;
  lat: number | null;
  lng: number | null;
  sourceUrl: string;
};

async function lookup(name: string): Promise<Subject | null> {
  const url =
    `${API}?action=query&generator=search&gsrsearch=${encodeURIComponent(name)}&gsrlimit=1` +
    `&prop=extracts|pageimages|coordinates&exintro=1&explaintext=1&piprop=original&format=json&origin=*`;
  const r = await fetch(url, { headers: { "user-agent": UA } });
  if (!r.ok) throw new Error(`the encyclopedic source answered ${r.status}`);
  const data = (await r.json()) as { query?: { pages?: Record<string, Record<string, unknown>> } };
  const pages = data.query?.pages ? Object.values(data.query.pages) : [];
  const page = pages[0];
  if (!page) return null;
  const coords = Array.isArray(page.coordinates) ? (page.coordinates[0] as { lat?: number; lon?: number }) : null;
  const original = (page.original ?? null) as { source?: string } | null;
  const title = String(page.title ?? name);
  return {
    name: title,
    description: String(page.extract ?? "").trim(),
    imageUrl: String(original?.source ?? "").trim(),
    lat: typeof coords?.lat === "number" ? coords.lat : null,
    lng: typeof coords?.lon === "number" ? coords.lon : null,
    sourceUrl: `https://en.wikipedia.org/?curid=${String(page.pageid ?? "")}`,
  };
}

export async function fetchExternal(ctx: NodeCtx): Promise<NodeCtx> {
  // Добываем только там, где данных в сообщении НЕТ: остальным классам этот узел не нужен.
  if (!servesAnyClass(ctx, ["fetch-external", "composite"])) return {};
  const name = subjectNameOf(String(ctx.text ?? ""));
  if (!name) return {};

  // 🔒 НЕ НАШЛИ — НЕ ЗАПИСЫВАЕМ (дефект, пойманный живым прогоном 311.7). Раньше при неудачной добыче
  // склады получали исходный ТЕКСТ ЗАПРОСА и честно сохраняли его как запись: в базе оседало «show me
  // the Eiffel Tower» вместо сведений о башне. Класс «добыча» оставляет запись только тогда, когда есть
  // ЧТО записывать, поэтому оба неудачных исхода гасят склады (`skipDatabase`/`skipMap`) и отвечают
  // человеку правдой.
  const nothingToStore = { skipStores: true, subjectQuery: name };
  let found: Subject | null = null;
  try {
    found = await lookup(name);
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    return { ...nothingToStore, subjectError: why, reply: `I could not reach the source to look up “${name}” — ${why}.` };
  }
  if (!found || !found.description) {
    return { ...nothingToStore, subjectMissing: name, reply: `I found nothing about “${name}” in the open encyclopedic source.` };
  }

  return {
    subject: found,
    subjectQuery: name,
    // Развозка идёт по общему контракту сообщения: текст и заголовок — это то, что увидят склады.
    title: found.name,
    text: found.description,
    // Координаты кладём в контракт сообщения, чтобы выход карты получил их обычным путём.
    ...(found.lat !== null && found.lng !== null ? { lat: found.lat, lng: found.lng, placeTitle: found.name } : {}),
  };
}
