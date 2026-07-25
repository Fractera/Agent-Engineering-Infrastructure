import { NextRequest, NextResponse } from "next/server"
import { serviceApiGate } from "@/lib/service-auth"
import { readEnvFile } from "@/lib/env-file"
import { loadGeofabrik, childrenOf, bestMatch, findCountry, toRegion, type GeoFeature } from "@/lib/geofabrik"

// ИИ-ПОДБОР РЕГИОНОВ — сердце флоу «текст → ИИ → сверка с каталогом → чекбоксы» (закон владельца 2026-07-25).
// Пользователь пишет живым языком места, которые ему нужны («Волгоград и Волжский»). ИИ определяет страну и,
// ГЛАВНОЕ, выбирает подходящие единицы ИЗ РЕАЛЬНОГО списка доступных под-регионов этой страны (Geofabrik) —
// это и есть сверка: чекбоксы получают только то, что действительно существует и скачиваемо. ИИ — переводчик,
// авторитет — каталог. Ни от каких внешних сервисов, кроме OpenAI по глобальному ключу, флоу не зависит.
export const runtime = "nodejs"
const HERMES_ENV = process.env.HERMES_ENV_PATH ?? "/root/.hermes/.env"
const RAG_ENV = process.env.RAG_ENV_PATH ?? "/opt/fractera/services/rag/.env"
const MODEL = process.env.MAP_AI_MODEL ?? "gpt-4o-mini"

function apiKey(): string | null {
  const h = readEnvFile(HERMES_ENV); if (h.OPENAI_API_KEY) return h.OPENAI_API_KEY
  const r = readEnvFile(RAG_ENV); return r.LLM_BINDING_API_KEY || r.OPENAI_API_KEY || null
}

async function ask(key: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, temperature: 0, messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(20000),
  })
  const j = await res.json()
  return j?.choices?.[0]?.message?.content ?? ""
}
const parseJsonArray = (s: string): string[] => {
  const m = s.match(/\[[\s\S]*\]/); if (!m) return []
  try { const a = JSON.parse(m[0]); return Array.isArray(a) ? a.map(String) : [] } catch { return [] }
}

async function sizeOf(url: string): Promise<number | null> {
  try {
    const r = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(6000) })
    const n = Number(r.headers.get("content-length")); return Number.isFinite(n) && n > 0 ? n : null
  } catch { return null }
}

export async function POST(req: NextRequest) {
  if (!(await serviceApiGate(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const text = String((await req.json().catch(() => ({})))?.text ?? "").trim()
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 })
  const key = apiKey()
  if (!key) return NextResponse.json({ error: "no_ai_key", regions: [] })

  let idx
  try { idx = await loadGeofabrik() } catch { return NextResponse.json({ error: "geofabrik unavailable" }, { status: 502 }) }

  // 1) страны, содержащие места (английские имена, как у Geofabrik).
  const countries = parseJsonArray(await ask(key, `The user needs offline map data covering these places: "${text}". List the COUNTRIES (English names as OpenStreetMap/Geofabrik uses, e.g. "Russian Federation", "Germany") that contain them. Return ONLY a JSON array of strings.`)).slice(0, 4)

  const picked = new Map<string, GeoFeature>() // id → feature, без дублей
  for (const cName of countries) {
    const country = findCountry(idx, cName)
    if (!country) continue
    const kids = childrenOf(idx, country.properties.id)
    if (kids.length === 0) { picked.set(country.properties.id, country); continue }
    // 2) СВЕРКА: ИИ выбирает подходящие единицы ИЗ РЕАЛЬНОГО списка доступных под-регионов.
    const names = kids.map((k) => k.properties.name)
    const chosen = parseJsonArray(await ask(key, `Available sub-regions of ${country.properties.name}: ${JSON.stringify(names)}. The user needs map data covering: "${text}". Return the EXACT names from that list whose area contains those places (usually 1–2). If none fits, return the closest one. Return ONLY a JSON array of exact names from the list.`))
    let any = false
    for (const nm of chosen) { const f = bestMatch(kids, nm); if (f) { picked.set(f.properties.id, f); any = true } }
    if (!any) picked.set(country.properties.id, country) // не сматчили — предложим страну целиком
  }

  // Собрать чекбоксы: реальные записи каталога + размер файла (для честной пометки веса/времени).
  const regions = await Promise.all([...picked.values()].map(async (f) => {
    const r = toRegion(idx, f)
    return { id: r.id, name: r.name, pbfUrl: r.pbfUrl, geometry: r.geometry, sizeBytes: r.pbfUrl ? await sizeOf(r.pbfUrl) : null }
  }))
  return NextResponse.json({ regions, countries })
}
