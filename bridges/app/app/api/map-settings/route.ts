import { NextRequest, NextResponse } from "next/server"
import { serviceApiGate } from "@/lib/service-auth"

// OpenMap-НАСТРOЙКИ (Admin :3002) — ТОНКИЙ ПРОКСИ к geo-сервису. Единственный источник настроек geo — сам
// `fractera-geo` (:3400). Регионы выбираются из ЖИВОГО мирового каталога (`/api/map-regions`, Geofabrik),
// а не из фиксированного списка — любой регион мира.
//   GET  → {config, health, provision}   (активный регион + статус движков + прогресс загрузки)
//   POST {op:"provision", pbfUrl, name}  → РЕАЛЬНО сменить регион: фоновая загрузка+обработка карты
const GEO = process.env.GEO_SERVICE_URL ?? "http://localhost:3400"
const j = (u: string, init?: RequestInit) => fetch(u, { cache: "no-store", signal: AbortSignal.timeout(6000), ...init }).then((r) => r.json())

// id региона для имени файла .osrm выводим из имени файла карты: ".../japan-latest.osm.pbf" → "japan".
const regionIdFromUrl = (pbfUrl: string): string =>
  (pbfUrl.split("/").pop() ?? "").replace(/-latest\.osm\.pbf$/, "").replace(/[^a-z0-9-]/gi, "-").toLowerCase()

export async function GET(req: NextRequest) {
  if (!(await serviceApiGate(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const [config, health, provision] = await Promise.all([
    j(`${GEO}/geo/config`).catch(() => null),
    j(`${GEO}/geo/health`).catch(() => ({ ok: false, osrm: false, geocoder: false })),
    j(`${GEO}/geo/provision-status`).catch(() => ({ state: "idle" })),
  ])
  return NextResponse.json({ config, health, provision })
}

export async function POST(req: NextRequest) {
  if (!(await serviceApiGate(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const op = body?.op ?? "config"

  if (op === "provision") {
    // Одна или НЕСКОЛЬКО карт (отмеченные чекбоксы). Все — валидные ссылки Geofabrik.
    const pbfUrls: string[] = Array.isArray(body?.pbfUrls) ? body.pbfUrls.map(String) : (body?.pbfUrl ? [String(body.pbfUrl)] : [])
    if (pbfUrls.length === 0 || !pbfUrls.every((u) => /^https:\/\/download\.geofabrik\.de\/.+\.osm\.pbf$/.test(u))) {
      return NextResponse.json({ error: "Geofabrik .osm.pbf url(s) required" }, { status: 400 })
    }
    // id датасета: из имён файлов (склейка нескольких → составной id), в пределах [a-z0-9-].
    const regionId = pbfUrls.map(regionIdFromUrl).join("-").slice(0, 48).replace(/-+$/,"") || "region"
    const r = await fetch(`${GEO}/geo/provision`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regionId, pbfUrls }), signal: AbortSignal.timeout(6000),
    }).catch(() => null)
    if (!r) return NextResponse.json({ error: "geo service unavailable" }, { status: 502 })
    return NextResponse.json(await r.json(), { status: r.status })
  }

  // op === "config": провайдер/ключ (топливо больше НЕ настройка карты — убрано по решению владельца).
  const r = await fetch(`${GEO}/geo/config`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(6000),
  }).catch(() => null)
  if (!r || !r.ok) return NextResponse.json({ error: "geo service unavailable" }, { status: 502 })
  return NextResponse.json({ config: await r.json() })
}
