// Серверное чтение состояния ключа OpenAI (шаг 501, Ф2, партия 12).
//
// ГЛАВНОЕ ОТЛИЧИЕ ОТ СТАРОЙ ПАНЕЛИ. Там был ОДИН индикатор «ключ задан», взятый у
// слоя данных. Но маршрут сохранения раздаёт ключ ДВУМ службам: слою данных (для
// векторов) и службе агентного RAG (там он нужен под тремя именами). У второй
// отказ МОЛЧАЛИВЫЙ — приём документа отвечает 200 и не встраивает ничего, и этот
// дефект однажды стоил дня. Один индикатор на двух потребителей скрывает ровно
// половину правды, поэтому здесь читаются оба.

import { headers } from "next/headers";

const ADMIN = process.env.ADMIN_INTERNAL_URL ?? "http://127.0.0.1:3002";
const RAG_ENV = process.env.RAG_ENV_PATH ?? "/opt/fractera/services/rag/.env";
const APP_ENV = process.env.APP_ENV_PATH ?? "/opt/fractera/app/.env.local";

export type OpenAiState = {
  // Слой данных: он же отвечает, работает ли векторный поиск.
  vectors: { configured: boolean; model: string | null; reachable: boolean };
  // Служба графа знаний: ключ в её СОБСТВЕННОМ окружении.
  graph: { configured: boolean };
  // Гостевое приложение: из этого же ключа платят голосовой ввод и перевод
  // полей записей. Ключ живёт в окружении слота — своё состояние, своя правда.
  app: { configured: boolean };
};

export async function readOpenAiState(): Promise<OpenAiState> {
  const cookie = (await headers()).get("cookie") ?? "";

  let vectors = { configured: false, model: null as string | null, reachable: false };
  try {
    const r = await fetch(`${ADMIN}/api/config/embeddings`, {
      headers: { cookie },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (r.ok) {
      const d = await r.json();
      vectors = {
        configured: Boolean(d.configured),
        model: (d.model as string) ?? null,
        reachable: d.reachable !== false,
      };
    }
  } catch { /* остаётся «не задан» — честнее, чем догадка */ }

  // Ключ службы RAG проверяем по её файлу окружения, а не по продуктовому ключу:
  // он мог не доехать, и тогда «задан» было бы ложью.
  let graph = false;
  try {
    const fs = await import("node:fs");
    if (fs.existsSync(RAG_ENV)) {
      graph = /^(EMBEDDING_BINDING_API_KEY|LLM_BINDING_API_KEY|OPENAI_API_KEY)=.+$/m
        .test(fs.readFileSync(RAG_ENV, "utf-8"));
    }
  } catch { /* нет файла — служба не установлена */ }

  // Приложение читает ключ из своего `.env.local`: проверяем ИМЕННО его, а не
  // наличие ключа вообще. Ключ, доехавший до графа и не доехавший до слота, —
  // ровно тот случай, когда «задан» было бы ложью.
  let app = false;
  try {
    const fs = await import("node:fs");
    if (fs.existsSync(APP_ENV)) {
      app = /^OPENAI_API_KEY=.+$/m.test(fs.readFileSync(APP_ENV, "utf-8"));
    }
  } catch { /* нет файла — слот пуст */ }

  return { vectors, graph: { configured: graph }, app: { configured: app } };
}
