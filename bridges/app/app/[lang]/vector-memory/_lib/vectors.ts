// Серверное чтение векторного склада (шаг 501, Ф2, партия 5).
//
// Векторы принадлежат слою данных `:3300` — там же лежит их таблица, там же
// вызывается модель встраивания и там же хранится ключ. Панель ключа не держит
// никогда, она только предъявляет внутренний секрет.
//
// Старая панель шла двумя прыжками: браузер → `/api/config/embeddings` и
// `/api/vectors/search` (маршруты панели) → слой данных. Со страницы первый
// прыжок лишний. Маршруты остаются — ими живёт замороженная старая панель.

const DATA_URL = process.env.DATA_INTERNAL_URL ?? "http://127.0.0.1:3300";
const DATA_SECRET = process.env.DATA_SECRET ?? "";

const headers = () => ({ "x-data-secret": DATA_SECRET, "Content-Type": "application/json" });

export type VectorStatus = {
  configured: boolean;
  model: string;
  dims: number;
  indexed: boolean;
  count: number;
};

export type Hit = {
  id: string;
  collection: string;
  refTable?: string | null;
  refId?: string | null;
  text: string;
  score: number;
};

export type StatusResult = { ok: true; status: VectorStatus } | { ok: false; reason: string };
export type SearchResult = { ok: true; hits: Hit[] } | { ok: false; reason: string };

export async function readStatus(): Promise<StatusResult> {
  try {
    const r = await fetch(`${DATA_URL}/vectors/status`, {
      headers: headers(),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return { ok: false, reason: `data service: ${r.status}` };
    const d = await r.json();
    return {
      ok: true,
      status: {
        configured: Boolean(d.configured),
        model: String(d.model ?? "—"),
        dims: Number(d.dims ?? 0),
        indexed: Boolean(d.indexed),
        count: Number(d.count ?? 0),
      },
    };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

// Поиск по смыслу выполняет СЕРВЕР, по запросу из адреса. Поэтому у раздела нет
// ни одного клиентского островка: результаты приезжают внутри HTML и читаются с
// выключенным JS, а ссылку с запросом можно переслать.
//
// Цена та же, что была: один вызов встраивания на запрос. Разница лишь в том, кто
// его делает — сервер вместо браузера.
export async function searchVectors(query: string, k = 5): Promise<SearchResult> {
  try {
    const r = await fetch(`${DATA_URL}/vectors/search`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ query, k }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, reason: String(d?.error ?? r.status) };
    return { ok: true, hits: Array.isArray(d.results) ? (d.results as Hit[]) : [] };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}
