// Серверное чтение агентного RAG (шаг 501, Ф2, партия 6).
//
// Граф знаний живёт отдельной службой на `:9621` и говорит своим ключом
// `X-API-Key`. Страница обращается к ней НАПРЯМУЮ, минуя собственные маршруты
// панели: те остаются для замороженной старой панели и для клиентского островка
// (действия по-прежнему идут через панель, как и везде).
//
// Служба может быть выключена намеренно — это выбор архитектора, а не поломка.
// Поэтому «недоступна» здесь отдельное честное состояние, а не пустой список.

const RAG_URL = process.env.LIGHTRAG_URL ?? "http://localhost:9621";
const RAG_KEY = process.env.LIGHTRAG_API_KEY ?? "";
const RAG_ENV = process.env.RAG_ENV_PATH ?? "/opt/fractera/services/rag/.env";

const key = () => ({ "X-API-Key": RAG_KEY });

export type RagHealth = {
  available: boolean;
  llmModel?: string;
  embeddingModel?: string;
  workingDirectory?: string;
};

export type RagDocument = {
  id: string;
  status: string;
  source: string | null;
  summary: string;
  chunks: number;
};

export async function readHealth(): Promise<RagHealth> {
  try {
    const r = await fetch(`${RAG_URL}/health`, {
      headers: key(),
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return { available: false };
    const d = await r.json();
    return {
      available: true,
      llmModel: d?.configuration?.llm_model,
      embeddingModel: d?.configuration?.embedding_model,
      workingDirectory: d?.working_directory,
    };
  } catch {
    return { available: false };
  }
}

// Ключ, дошедший именно ДО ЭТОЙ службы. Проверяем её собственный `.env`, а не
// продуктовый ключ: у неё молчаливый отказ — приём отвечает 200 и не встраивает
// ничего. Этот дефект однажды стоил дня.
export async function readKeyConfigured(): Promise<boolean> {
  try {
    const fs = await import("node:fs");
    if (!fs.existsSync(RAG_ENV)) return false;
    const text = fs.readFileSync(RAG_ENV, "utf-8");
    return /^(EMBEDDING_BINDING_API_KEY|OPENAI_API_KEY)=.+$/m.test(text);
  } catch {
    return false;
  }
}

export async function readDocuments(): Promise<{ ok: true; documents: RagDocument[] } | { ok: false }> {
  try {
    const r = await fetch(`${RAG_URL}/documents`, {
      headers: key(),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return { ok: false };
    const d = await r.json();
    const buckets: Record<string, {
      id: string; file_path?: string; content_summary?: string; status?: string; chunks_count?: number;
    }[]> = d?.statuses ?? {};
    const documents = Object.entries(buckets).flatMap(([status, rows]) =>
      (rows ?? []).map((x) => ({
        id: x.id,
        status: x.status ?? status,
        source: x.file_path && x.file_path !== "unknown_source" ? x.file_path : null,
        summary: (x.content_summary ?? "").slice(0, 160),
        chunks: x.chunks_count ?? 0,
      })),
    );
    return { ok: true, documents };
  } catch {
    return { ok: false };
  }
}

export type Answer = { ok: true; text: string } | { ok: false; reason: string };

// Вопрос графу выполняет СЕРВЕР по запросу из адреса — как и поиск в векторной
// памяти. Ответ приезжает внутри HTML, читается без JS, ссылку можно переслать.
// Ждать приходится долго (у графа это десятки секунд), и ожидание показывает сам
// браузер — это честнее спиннера, который врёт о прогрессе.
export async function askGraph(query: string, mode = "hybrid"): Promise<Answer> {
  try {
    const r = await fetch(`${RAG_URL}/query`, {
      method: "POST",
      headers: { ...key(), "Content-Type": "application/json" },
      body: JSON.stringify({ query, mode }),
      cache: "no-store",
      signal: AbortSignal.timeout(60000),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, reason: `LightRAG ${r.status}` };
    const text = String(d?.response ?? d?.answer ?? "").trim();
    return text ? { ok: true, text } : { ok: false, reason: "empty-answer" };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}
