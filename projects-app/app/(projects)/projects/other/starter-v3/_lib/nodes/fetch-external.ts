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

/**
 * 🔒 ИСКАТЬ НА ЯЗЫКЕ ЧЕЛОВЕКА И СНАЧАЛА ТОЧНОЕ НАЗВАНИЕ (332.E, дефект найден владельцем живьём).
 *
 * Было: всегда английская вики и всегда нечёткий поиск с первым попавшимся результатом. Человек написал
 * «Эйфелева башня» — источник вернул статью «Eiffel Tower replicas and derivatives», то есть НЕ тот
 * предмет, и дальше по складам поехала чужая картинка с чужой датой. Тихая подмена предмета хуже
 * ненайденного: человек получает уверенный ответ не о том.
 *
 * Лечение в два шага, оба дешёвые: (1) спрашиваем вики ТОГО ЯЗЫКА, на котором человек говорит — там его
 * название точное; (2) сначала пробуем ТОЧНОЕ НАЗВАНИЕ (с редиректами), и только если такой статьи нет,
 * переходим к нечёткому поиску. Не нашли на своём языке — пробуем английскую как самую полную.
 */
const apiOf = (lang: string) => `https://${/^[a-z]{2}$/.test(lang) ? lang : "en"}.wikipedia.org/w/api.php`;
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

const FIELDS = "&prop=extracts|pageimages|coordinates&exintro=1&explaintext=1&piprop=original&format=json&origin=*";

/** Одно обращение к вики: либо по точному названию, либо поиском. `null` — статьи нет. */
async function askWiki(api: string, name: string, exact: boolean): Promise<Record<string, unknown> | null> {
  const query = exact
    ? `action=query&titles=${encodeURIComponent(name)}&redirects=1`
    : `action=query&generator=search&gsrsearch=${encodeURIComponent(name)}&gsrlimit=1`;
  const r = await fetch(`${api}?${query}${FIELDS}`, { headers: { "user-agent": UA } });
  if (!r.ok) throw new Error(`the encyclopedic source answered ${r.status}`);
  const data = (await r.json()) as { query?: { pages?: Record<string, Record<string, unknown>> } };
  const page = data.query?.pages ? Object.values(data.query.pages)[0] : undefined;
  // Точный запрос на несуществующее название возвращает страницу с пометкой `missing` — это НЕ находка.
  if (!page || "missing" in page || !String(page.extract ?? "").trim()) return null;
  return page;
}

async function lookup(name: string, lang: string): Promise<Subject | null> {
  const own = apiOf(lang);
  // Порядок — от самого точного к самому терпимому: своё название на своём языке → поиск на своём языке →
  // то же на английском (самая полная вики). Первый непустой ответ побеждает.
  const attempts: { api: string; exact: boolean }[] = [
    { api: own, exact: true },
    { api: own, exact: false },
    ...(own === apiOf("en") ? [] : [{ api: apiOf("en"), exact: true }, { api: apiOf("en"), exact: false }]),
  ];
  let page: Record<string, unknown> | null = null;
  let api = own;
  for (const a of attempts) {
    page = await askWiki(a.api, name, a.exact);
    if (page) { api = a.api; break; }
  }
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
    // Адрес — ТОЙ вики, что реально ответила: ссылка на английскую статью под русским текстом была бы
    // ещё одной мелкой ложью в ответе.
    sourceUrl: `${api.replace("/w/api.php", "")}/?curid=${String(page.pageid ?? "")}`,
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
    // Язык человека приходит из канала (`lang` пульта) или определяется слоем намерения; вики берётся его.
    // `||`, а НЕ `??`: движок кладёт `chatLang: ""` для нового чата, и `??` его не пропускает — язык
    // терялся, вики оставалась английской, а человек получал «Eiffel Tower replicas» на русский запрос.
    found = await lookup(name, String(ctx.chatLang || ctx.lang || "").toLowerCase().slice(0, 2));
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
