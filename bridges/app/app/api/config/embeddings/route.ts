import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { requireAuth } from "@/lib/require-auth";

// Step 500 — the embeddings key of the data layer's vector store.
//
// Replaces /api/config/rag, which configured LightRAG (:9621). LightRAG was
// installed to make the Hermes agent smarter; with Hermes gone its graph half
// went too, and the vector half now lives inside the data service (:3300),
// sharing that service's database, backup and auth. So the key it needs is the
// data service's own OPENAI_API_KEY — nothing else changes.

const DATA_URL = process.env.DATA_INTERNAL_URL ?? "http://127.0.0.1:3300";

// 🪦 ЗДЕСЬ СТОЯЛИ ПУТИ ТРЁХ ФАЙЛОВ ОКРУЖЕНИЯ И РАЗБОРЩИК `.env`.
// УДАЛЕНЫ ШАГОМ 109-4: панель больше не знает, у кого какие файлы и какие имена
// переменных — это знание живёт в службе данных и нигде больше. Вернув сюда
// список путей «чтобы не ходить лишний раз», вы вернёте и дефект: три копии
// списка разошлись молча и оставили граф знаний слепым.

// GET — is the store usable, which model, how many records. Asks the data
// service itself rather than guessing from the env file, so a key that is
// present but rejected by OpenAI still shows up as a failure at first use.
export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const r = await fetch(`${DATA_URL}/vectors/status`, {
      headers: { "x-data-secret": process.env.DATA_SECRET ?? "" },
      cache: "no-store",
    });
    if (!r.ok) return NextResponse.json({ configured: false, reachable: false });
    const data = await r.json();
    return NextResponse.json({ ...data, reachable: true });
  } catch {
    return NextResponse.json({ configured: false, reachable: false });
  }
}

// POST { apiKey } — write the key into the data service env and restart it.
// The restart is what makes the key live: the service reads process.env once.
export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  if (!apiKey.startsWith("sk-")) {
    return NextResponse.json({ error: "Expected an OpenAI key starting with sk-" }, { status: 400 });
  }

  // 🪦 ЗДЕСЬ ПАНЕЛЬ ПИСАЛА ТРИ ФАЙЛА САМА. ОТМЕНЕНО ШАГОМ 109-4 (2026-09-04).
  //
  // ✗ ЧЕМ ОПЛАЧЕН ПЕРЕЕЗД. Ключ вводится в трёх местах — здесь, на экране
  // архитектора и в чате, — и каждое держало СВОЙ список потребителей и имён.
  // Они разошлись молча: экран писал графу `OPENAI_API_KEY`, которую LightRAG не
  // читает, чат не писал графу вовсе. Плашка зеленела, граф оставался слепым.
  // Эта дверь была из трёх самой правильной — и именно поэтому её правда переехала
  // в службу данных целиком, а не была продублирована в четвёртый раз.
  //
  // 🔒 ДВА ПОБОЧНЫХ УЛУЧШЕНИЯ, КОТОРЫЕ ДАЛ ПЕРЕЕЗД:
  // 1. дверь правит СТРОКУ, а не пересобирает файл из разобранных пар — комментарии
  //    и пустые строки в `.env` служб больше не теряются;
  // 2. `OPENAI_API_KEY` графу больше не пишется. Измерено 2026-09-03: LightRAG
  //    работает от `LLM_BINDING_API_KEY` и `EMBEDDING_BINDING_API_KEY`; что он
  //    читает ещё и третье имя — было предположением, и лишняя переменная делает
  //    плашку зелёной по признаку, которого служба может не смотреть.
  let written: string[] = [];
  try {
    const r = await fetch(`${DATA_URL}/platform/openai-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-data-secret": process.env.DATA_SECRET ?? "" },
      body: JSON.stringify({ key: apiKey }),
      cache: "no-store",
    });
    if (!r.ok) {
      return NextResponse.json({ error: `Key door answered ${r.status}` }, { status: 500 });
    }
    const d = (await r.json()) as { ok?: boolean; written?: string[]; failed?: string[] };
    if (!d.ok) {
      return NextResponse.json({ error: `Key not delivered: ${(d.failed ?? []).join(", ")}` }, { status: 500 });
    }
    written = d.written ?? [];
  } catch (e) {
    return NextResponse.json({ error: `Key door unreachable: ${String(e)}` }, { status: 500 });
  }

  const ragUpdated = written.includes("graph");
  const appUpdated = written.includes("app");

  // Best-effort: a failed restart must not lose the key that is already saved.
  let restarted = true;
  try {
    execSync("pm2 restart fractera-data", { timeout: 20_000, stdio: "ignore" });
  } catch {
    restarted = false;
  }
  // Only restart RAG if it actually received the key, and only if it is running —
  // a stopped service is the architect's choice, not something to undo here.
  if (ragUpdated) {
    try { execSync("pm2 restart fractera-rag", { timeout: 20_000, stdio: "ignore" }); } catch { /* stopped or absent */ }
  }

  return NextResponse.json({ ok: true, restarted, ragUpdated, appUpdated });
}
