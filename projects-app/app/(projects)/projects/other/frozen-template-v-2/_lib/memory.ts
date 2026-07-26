// ВЕКТОРНАЯ ПАМЯТЬ — как автоматизация запоминает факт в LightRAG. Папка самодостаточна (закон 0),
// поэтому платформенный `lib/vector-memory` НЕ импортируется: здесь собственный тонкий вызов того же
// проверенного контракта (`POST /documents/text` → `{ track_id }`, провенанс в `file_source`).
//
// ПРОВЕНАНС — адрес автоматизации + фасеты (закон шага 260): `projects/other/frozen-template-v-2`
// с `?channel=<канал>&record=<случайный хвост>`. Хвост обязателен: LightRAG считает `file_source`
// ИДЕНТИЧНОСТЬЮ документа, и второй факт с тем же адресом молча пропал бы (доказано на medicine/v2).
//
// ДВЕ РАЗНЫЕ НЕУДАЧИ — ДВА РАЗНЫХ ОТВЕТА:
//   сервис НЕДОСТУПЕН (нет процесса на :9621) → `null`: памяти на этом сервере нет, узел честно
//     пропускает доставку с причиной — проект без LightRAG не должен терять всю развозку;
//   сервис ОТВЕТИЛ ОТКАЗОМ → бросок: память есть, но запись не принята — это провал доставки,
//     и молчать о нём нельзя (закон `kind.output.md`).
import { randomBytes } from "node:crypto";

const AUTOMATION = "other/frozen-template-v-2";
const ragUrl = () => (process.env.LIGHTRAG_URL ?? "http://127.0.0.1:9621").replace(/\/+$/, "");

export async function rememberFact(text: string, source: string): Promise<string | null> {
  const body = (t: string) => t.trim();
  if (!body(text)) return null;

  const fileSource = `projects/${AUTOMATION}?channel=${encodeURIComponent(source)}&record=${randomBytes(6).toString("hex")}`;
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
