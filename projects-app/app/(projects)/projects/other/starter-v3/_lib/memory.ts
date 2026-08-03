// ВЕКТОРНАЯ ПАМЯТЬ — как автоматизация ЗАПОМИНАЕТ факт в LightRAG и ВСПОМИНАЕТ по вопросу (шаг 307:
// чтение — штатная способность v2, узловой навык №1). Папка самодостаточна (закон 0), поэтому
// платформенный `lib/vector-memory` НЕ импортируется: здесь собственные тонкие вызовы тех же
// проверенных контрактов (`POST /documents/text` → `{ track_id }`, провенанс в `file_source`;
// `POST /query {query, mode:"hybrid"}` → `{ response }` — тот же нативный контракт, что у
// платформенного прокси `api/rag/query` и hermes-плагина).
//
// ПРОВЕНАНС — адрес автоматизации + фасеты (закон шага 260): `projects/other/starter-v3`
// с `?channel=<канал>&record=<случайный хвост>`. Хвост обязателен: LightRAG считает `file_source`
// ИДЕНТИЧНОСТЬЮ документа, и второй факт с тем же адресом молча пропал бы (доказано на medicine/v2).
//
// ФАСЕТ `bot` (2026-07-27): один проект может иметь НЕСКОЛЬКО Telegram-ботов (у каждого пользователя свой),
// поэтому для канала telegram-bot к фасетам добавляется публичный ID бота — `&bot=<botId>`. Без него в
// векторной памяти нельзя различить, от какого пользователя (бота) пришёл факт. Секрет токена сюда НЕ идёт.
//
// ДВЕ РАЗНЫЕ НЕУДАЧИ — ДВА РАЗНЫХ ОТВЕТА:
//   сервис НЕДОСТУПЕН (нет процесса на :9621) → `null`: памяти на этом сервере нет, узел честно
//     пропускает доставку с причиной — проект без LightRAG не должен терять всю развозку;
//   сервис ОТВЕТИЛ ОТКАЗОМ → бросок: память есть, но запись не принята — это провал доставки,
//     и молчать о нём нельзя (закон `kind.output.md`).
import { randomBytes } from "node:crypto";
import { AUTOMATION_ADDRESS as AUTOMATION } from "./paths";
const ragUrl = () => (process.env.LIGHTRAG_URL ?? "http://127.0.0.1:9621").replace(/\/+$/, "");

/**
 * 🔒 ФАСЕТ `kind` — ЧТО ЭТО ЗА ДОКУМЕНТ (шаг 330.5, требование владельца). Индекс общий на сервер, и в нём
 * лежат вперемешку добытые факты о предметах и реплики разговоров. Без пометки прямо в имени документа
 * поиск «помнишь, мы говорили о…» вытащил бы описание Эйфелевой башни и выдал его за наш разговор.
 * `fact` — умолчание (так писали до этого шага, старые документы остаются законными).
 */
export type MemoryKind = "fact" | "conversation";

export async function rememberFact(
  text: string,
  source: string,
  botId?: string,
  kind: MemoryKind = "fact",
): Promise<string | null> {
  const body = (t: string) => t.trim();
  if (!body(text)) return null;

  // Фасет `bot` — только при наличии botId (канал telegram-bot). Публичный ID, без секрета токена.
  const botFacet = botId && botId.trim() ? `&bot=${encodeURIComponent(botId.trim())}` : "";
  const kindFacet = kind === "fact" ? "" : `&kind=${encodeURIComponent(kind)}`;
  const fileSource = `projects/${AUTOMATION}?channel=${encodeURIComponent(source)}${botFacet}${kindFacet}&record=${randomBytes(6).toString("hex")}`;
  let r: Response;
  try {
    r = await fetch(`${ragUrl()}/documents/text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.LIGHTRAG_API_KEY ?? "",
        "X-Agent-Identity": AUTOMATION,
      },
      body: JSON.stringify({ text: body(text), file_source: fileSource }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return null; // сервиса памяти нет — «канал не подключён», а не «доставка провалена»
  }
  if (!r.ok) throw new Error(`vector memory refused the fact (HTTP ${r.status})`);
  const data = (await r.json().catch(() => null)) as { track_id?: string } | null;
  return data?.track_id ?? "accepted";
}

// ВСПОМНИТЬ — семантический вопрос к памяти. Ответ LightRAG — СИНТЕЗИРОВАННАЯ ПРОЗА (retrieval +
// generation на стороне памяти), готовая уйти пользователю как есть.
//
// Контракт неудач ЗЕРКАЛИТ запись (те же два разных ответа, см. шапку):
//   сервис НЕДОСТУПЕН → `null`: памяти на этом сервере нет — узел мягко деградирует, не падает;
//   сервис ОТВЕТИЛ ОТКАЗОМ → бросок: память есть, но вопрос не принят — молчать нельзя.
// Пустая строка ответа — законный исход «в памяти ничего не нашлось»; решает вызывающий узел.
export async function recallFacts(query: string): Promise<string | null> {
  const q = query.trim();
  if (!q) return "";

  let r: Response;
  try {
    r = await fetch(`${ragUrl()}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.LIGHTRAG_API_KEY ?? "",
        "X-Agent-Identity": AUTOMATION,
      },
      body: JSON.stringify({ query: q, mode: "hybrid" }),
      // Чтение дольше записи: память синтезирует ответ моделью, а не просто принимает документ.
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    return null; // сервиса памяти нет — «канал не подключён», а не «поиск провален»
  }
  if (!r.ok) throw new Error(`vector memory refused the question (HTTP ${r.status})`);
  const data = (await r.json().catch(() => null)) as { response?: string } | null;
  return (data?.response ?? "").trim();
}

// ─── ПОИСК ТОЛЬКО ПО СВОЕЙ АВТОМАТИЗАЦИИ (шаг 330.6) ────────────────────────────────────────────────
//
// 🔴 ПОЧЕМУ `recallFacts` СЮДА НЕ ГОДИТСЯ. Он зовёт `/query`, а тот отвечает СИНТЕЗИРОВАННОЙ ПРОЗОЙ,
// собранной из чанков ВСЕХ автоматизаций сервера — фильтра по источнику у `/query` нет вовсе (проверено
// по openapi: ни `file_source`, ни `filter`, ни `ids`). Отфильтровать готовую прозу постфактум нельзя:
// можно только не дать ей появиться. Иначе автоматизация уверенно скажет «да, мы это обсуждали» о
// разговоре, который шёл в СОСЕДНЕЙ автоматизации, — ровно то, что владелец назвал недопустимым.
//
// 🔒 ЛЕЧЕНИЕ: берём у памяти RETRIEVAL, а не ответ. `/query/data` возвращает чанки вместе с провенансом
// (`file_path` = ровно та строка, что мы писали при ингесте), мы оставляем СВОИ и отдаём выдержки узлу.
// Формулирует ответ наша речь — единственный автор ответа (закон 312), и она физически не может
// сослаться на чужой разговор, потому что чужого в её материале нет.
/**
 * `memRecordId` — наш маркер `[mem#…]` из начала текста документа. **Здесь он важнее, чем кажется:** чанк
 * НЕ несёт даты (проверено — у него только `reference_id`, `content`, `file_path`, `chunk_id`), поэтому
 * «когда это было сказано» берётся из НАШЕЙ строки разговора по этому маркеру. Ровно ради этого владелец и
 * потребовал хранить идентификатор вектор-записи рядом с текстом.
 */
export type Recalled = { text: string; channel: string; kind: string; memRecordId: string; filePath: string };

/** Снять маркер `[mem#id]` из начала выдержки: id — наружу, текст — человеку без служебной метки. */
function splitMarker(raw: string): { memRecordId: string; text: string } {
  const m = raw.match(/^\s*\[mem#([A-Za-z0-9]+)\]\s*/);
  return m ? { memRecordId: m[1], text: raw.slice(m[0].length).trim() } : { memRecordId: "", text: raw.trim() };
}

/** Разобрать провенанс документа: `projects/<адрес>?channel=…&kind=…&record=…`. */
function parseProvenance(filePath: string): { address: string; channel: string; kind: string } | null {
  const raw = String(filePath ?? "").trim();
  if (!raw.startsWith("projects/")) return null;
  const q = raw.indexOf("?");
  const address = (q === -1 ? raw : raw.slice(0, q)).slice("projects/".length);
  const params = new URLSearchParams(q === -1 ? "" : raw.slice(q + 1));
  return { address, channel: params.get("channel") ?? "", kind: params.get("kind") ?? "fact" };
}

/**
 * Спросить память и вернуть ТОЛЬКО СВОИ выдержки.
 *   `kind` — какого рода документы интересуют (`conversation` для «помнишь, мы говорили»); не задан — любые.
 * Исходы зеркалят запись: сервиса нет → `null`; сервис отказал → бросок; ничего своего → пустой массив.
 */
export async function recallScoped(
  question: string,
  opts: { kind?: MemoryKind; topK?: number } = {},
): Promise<{ items: Recalled[]; foreignDropped: number } | null> {
  const q = question.trim();
  if (!q) return { items: [], foreignDropped: 0 };

  let r: Response;
  try {
    r = await fetch(`${ragUrl()}/query/data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.LIGHTRAG_API_KEY ?? "",
        "X-Agent-Identity": AUTOMATION,
      },
      body: JSON.stringify({ query: q, mode: "hybrid", top_k: opts.topK ?? 10 }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    return null; // сервиса памяти нет — «канал не подключён», а не «поиск провален»
  }
  if (!r.ok) throw new Error(`vector memory refused the question (HTTP ${r.status})`);

  const data = (await r.json().catch(() => null)) as
    | { data?: { chunks?: { content?: string; file_path?: string }[] } }
    | null;
  const chunks = Array.isArray(data?.data?.chunks) ? data!.data!.chunks! : [];

  const items: Recalled[] = [];
  let foreignDropped = 0;
  for (const c of chunks) {
    const filePath = String(c?.file_path ?? "");
    // Документ может быть склеен из нескольких источников (`<SEP>`) — тогда берём первый: смешанный
    // чанк принадлежит нам, только если наш адрес стоит в нём вообще, и мы честно это проверяем.
    const first = filePath.split("<SEP>")[0];
    const prov = parseProvenance(first);
    const mine = prov?.address === AUTOMATION;
    if (!mine) { foreignDropped++; continue; }
    if (opts.kind && prov!.kind !== opts.kind) { foreignDropped++; continue; }
    const { memRecordId, text } = splitMarker(String(c?.content ?? ""));
    if (!text) continue;
    items.push({ text, channel: prov!.channel, kind: prov!.kind, memRecordId, filePath: first });
  }
  return { items, foreignDropped };
}
