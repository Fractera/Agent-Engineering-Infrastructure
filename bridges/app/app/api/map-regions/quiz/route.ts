import { NextRequest, NextResponse } from "next/server"
import { serviceApiGate } from "@/lib/service-auth"
import { readEnvFile } from "@/lib/env-file"
import { loadGeofabrik, toRegion, catalogMatches, type GeoFeature } from "@/lib/geofabrik"

// REGION QUIZ — диалоговый подбор региона (закон владельца 2026-07-25). Адаптация паттерна Quiz автоматизаций
// под настройки карт: короткая беседа с УТОЧНЕНИЯМИ доводит регион до точности, где одиночный вызов ИИ мажет
// (напр. «Волгоград» → Южный ФО, а не Приволжский). ИИ ведёт беседу по инструкции и на каждом ходу отвечает
// СТРОГИМ JSON: либо следующий вопрос, либо готовое решение (страна + под-регионы). Готовое решение мы
// СВЕРЯЕМ с реальным каталогом Geofabrik → чекбоксы только существующего. Зависимость одна — OpenAI по
// глобальному ключу.
export const runtime = "nodejs"
const HERMES_ENV = process.env.HERMES_ENV_PATH ?? "/root/.hermes/.env"
const RAG_ENV = process.env.RAG_ENV_PATH ?? "/opt/fractera/services/rag/.env"
const MODEL = process.env.MAP_AI_MODEL ?? "gpt-4o-mini"

function apiKey(): string | null {
  const h = readEnvFile(HERMES_ENV); if (h.OPENAI_API_KEY) return h.OPENAI_API_KEY
  const r = readEnvFile(RAG_ENV); return r.LLM_BINDING_API_KEY || r.OPENAI_API_KEY || null
}

const INSTRUCTION = (lang: string) => `You help the user pick which OFFLINE MAP REGION to download for their project.
Map data comes from OpenStreetMap/Geofabrik as COARSE extracts: continents, countries, and — for large countries or notable areas — sub-divisions (Russia → federal districts e.g. "South Federal District"; USA → states; Germany → federal states; Spain → autonomous communities e.g. "Andalucía"; islands like "Canary Islands" are their OWN extract). There is NO city-level extract — a city maps to the SMALLEST extract that CONTAINS it.
Your job: through a SHORT dialogue, determine the SMALLEST real extract that covers the user's places — never the whole country when a smaller extract fits (a country is huge and slow to process).
Rules:
- Be geographically PRECISE. Examples: Volgograd/Volzhsky → "South Federal District" of Russia (NOT the Volga one). Arona/Adeje (Tenerife) → "Canary Islands" (NOT mainland Spain).
- Before finalizing, send ONE short CONFIRMATION naming the extract you'll use and ask the user to confirm. Name the region in words only; do NOT invent sizes or write placeholders like "(~X)" — the app shows real size on the checkbox.
- Ask a clarifying question only if genuinely ambiguous. At most 2 questions total including the confirmation.
Reply in the user's language (${lang}). Respond with ONLY a JSON object, nothing else:
- to ask or confirm: {"ask":"<your question or confirmation, no size placeholders>"}
- only after the user agrees: {"ready":true,"search":["<candidate extract name(s), from MOST SPECIFIC to broadest, English as OSM/Geofabrik uses, e.g. 'Canary Islands','Spain' or 'South Federal District','Russian Federation'>"]}`

async function ask(key: string, messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, temperature: 0.2, messages }),
    signal: AbortSignal.timeout(25000),
  })
  const j = await res.json()
  return j?.choices?.[0]?.message?.content ?? ""
}
function parseObj(s: string): { ask?: string; ready?: boolean; search?: string[] } | null {
  const m = s.match(/\{[\s\S]*\}/); if (!m) return null
  try { return JSON.parse(m[0]) } catch { return null }
}
async function sizeOf(url: string): Promise<number | null> {
  try { const r = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(6000) }); const n = Number(r.headers.get("content-length")); return n > 0 ? n : null } catch { return null }
}

export async function POST(req: NextRequest) {
  if (!(await serviceApiGate(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const body = (await req.json().catch(() => ({}))) as { turns?: { role: string; content: string }[]; lang?: string }
  const turns = Array.isArray(body?.turns) ? body.turns.slice(-12) : []
  const lang = (body?.lang ?? "en").slice(0, 2)
  if (turns.length === 0) return NextResponse.json({ error: "empty" }, { status: 400 })
  const key = apiKey()
  if (!key) return NextResponse.json({ error: "no_ai_key" })

  const raw = await ask(key, [{ role: "system", content: INSTRUCTION(lang) }, ...turns.map((t) => ({ role: t.role === "assistant" ? "assistant" : "user", content: t.content }))])
  const obj = parseObj(raw)
  if (!obj) return NextResponse.json({ question: raw || "…" })            // ИИ не дал JSON — показываем как вопрос
  if (obj.ask && !obj.ready) return NextResponse.json({ question: obj.ask })

  // ГОТОВО → СВЕРКА с ЦЕЛЫМ каталогом Geofabrik по названиям-кандидатам (специфичное → общее). Берём ПЕРВЫЙ
  // кандидат, у которого есть реально скачиваемые совпадения — так Canary Islands (под Африкой!) побеждает
  // «Spain», а маленький округ побеждает страну. Каталог — авторитет; выдумки ИИ, которых нет, отсекаются.
  let idx
  try { idx = await loadGeofabrik() } catch { return NextResponse.json({ error: "geofabrik unavailable" }, { status: 502 }) }
  const terms = (obj.search ?? []).map(String).filter(Boolean)
  let picked: GeoFeature[] = []
  for (const term of terms) {
    const hits = catalogMatches(idx, term).filter((f) => f.properties.urls?.pbf) // только скачиваемое
    if (hits.length) { picked = hits.slice(0, 4); break }                        // первый результативный кандидат
  }
  const regions = await Promise.all(picked.map(async (f) => {
    const r = toRegion(idx, f)
    return { id: r.id, name: r.name, pbfUrl: r.pbfUrl, geometry: r.geometry, sizeBytes: r.pbfUrl ? await sizeOf(r.pbfUrl) : null }
  }))
  return NextResponse.json({ regions })
}
