import { NextRequest, NextResponse } from "next/server"
import { serviceApiGate } from "@/lib/service-auth"
import { loadGeofabrik, childrenOf, toRegion } from "@/lib/geofabrik"

// КАТАЛОГ РЕГИОНОВ (для карты и ручного поиска) — тонкая обёртка над живым индексом Geofabrik (lib/geofabrik).
//   GET ?parent=<id> → регионы уровня (пусто = континенты), с геометрией для карты
//   GET ?search=<q>  → регионы, чьё имя содержит q, без геометрии
export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  if (!(await serviceApiGate(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  let idx
  try { idx = await loadGeofabrik() } catch { return NextResponse.json({ error: "geofabrik index unavailable" }, { status: 502 }) }
  const p = req.nextUrl.searchParams
  const search = (p.get("search") ?? "").trim().toLowerCase()

  if (search) {
    const out = []
    for (const f of idx.all) {
      if (f.properties.name.toLowerCase().includes(search) || f.properties.id.toLowerCase().includes(search)) {
        const r = toRegion(idx, f); out.push({ id: r.id, name: r.name, parent: r.parent, pbfUrl: r.pbfUrl })
        if (out.length >= 60) break
      }
    }
    out.sort((a, b) => a.name.length - b.name.length)
    return NextResponse.json({ regions: out })
  }

  const parent = (p.get("parent") ?? "").trim()
  const regions = childrenOf(idx, parent).map((f) => toRegion(idx, f))
  return NextResponse.json({ regions })
}
