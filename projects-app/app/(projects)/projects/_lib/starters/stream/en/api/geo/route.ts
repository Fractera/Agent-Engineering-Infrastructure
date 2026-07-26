import { type NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";

// ДВЕРЬ ГЕО — тонкий прокси автоматизации к платформенному гео-сервису `fractera-geo` (:3400, loopback).
// Карта/маршрутные узлы зовут ЭТУ дверь (folder-local `api/geo`), а не сам :3400 напрямую — так публичный
// компонент остаётся в границах папки (закон 0: сетевой вызов двери, не внешний импорт), а хост порта geo
// прячется за платформой. Гео-сервис может быть выключен (компонент `maps`) — тогда честный 502, карта
// показывает подсказку, а не падает.
//
//   GET  api/geo                       → {config}  (дефолты топлива/регион — для расчёта бензина)
//   POST api/geo {op:"geocode", q}     → {lat,lon,name}
//   POST api/geo {op:"optimize", coords[]} → {order,geometry,totalKm,totalMin}  (курьерский TSP)
//   POST api/geo {op:"route"|"matrix", …}  → прозрачный проброс
export const runtime = "nodejs";

const GEO = process.env.GEO_SERVICE_URL ?? "http://127.0.0.1:3400";
const OP_PATH: Record<string, string> = {
  geocode: "/geo/geocode",
  matrix: "/geo/matrix",
  route: "/geo/route",
  optimize: "/geo/optimize",
};

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const r = await fetch(`${GEO}/geo/config`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    return NextResponse.json({ config: await r.json() });
  } catch {
    return NextResponse.json({ config: null, error: "geo service unavailable" }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { op?: string };
  const path = OP_PATH[String(body.op ?? "")];
  if (!path) return NextResponse.json({ error: "unknown op — geocode|matrix|route|optimize" }, { status: 400 });
  try {
    const r = await fetch(`${GEO}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    return NextResponse.json(await r.json(), { status: r.status });
  } catch {
    return NextResponse.json({ error: "geo service unavailable" }, { status: 502 });
  }
}
