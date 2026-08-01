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

export async function rememberFact(text: string, source: string, botId?: string): Promise<string | null> {
  const body = (t: string) => t.trim();
  if (!body(text)) return null;

  // Фасет `bot` — только при наличии botId (канал telegram-bot). Публичный ID, без секрета токена.
  const botFacet = botId && botId.trim() ? `&bot=${encodeURIComponent(botId.trim())}` : "";
  const fileSource = `projects/${AUTOMATION}?channel=${encodeURIComponent(source)}${botFacet}&record=${randomBytes(6).toString("hex")}`;
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
