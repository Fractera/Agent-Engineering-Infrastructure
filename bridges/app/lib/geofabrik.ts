// ЖИВОЙ КАТАЛОГ РЕГИОНОВ Geofabrik — единый источник «что реально доступно для загрузки». Индекс всех
// экстрактов OpenStreetMap (континенты → страны → их части), каждый с именем, родителем, ссылкой на карту
// (.osm.pbf) и геометрией границы. Тянем один раз, держим в памяти процесса. Используют и карта настроек,
// и сверка ИИ-подсказок с доступным (чекбоксы показывают ТОЛЬКО то, что есть здесь).
const INDEX_URL = "https://download.geofabrik.de/index-v1.json"

export type GeoFeature = {
  properties: { id: string; parent?: string; name: string; urls?: { pbf?: string } }
  geometry: unknown
}
export type GeoRegion = { id: string; name: string; parent: string | null; pbfUrl: string | null; hasChildren: boolean; geometry?: unknown }

type Index = { byId: Map<string, GeoFeature>; childrenByParent: Map<string, GeoFeature[]>; all: GeoFeature[]; at: number }
let cache: Index | null = null

export async function loadGeofabrik(): Promise<Index> {
  if (cache && Date.now() - cache.at < 24 * 3600_000) return cache
  const r = await fetch(INDEX_URL, { signal: AbortSignal.timeout(20000) })
  const data = (await r.json()) as { features: GeoFeature[] }
  const byId = new Map<string, GeoFeature>()
  const childrenByParent = new Map<string, GeoFeature[]>()
  for (const f of data.features) {
    if (!f.properties?.id) continue
    byId.set(f.properties.id, f)
    const parent = f.properties.parent ?? "__root__"
    const arr = childrenByParent.get(parent) ?? childrenByParent.set(parent, []).get(parent)!
    arr.push(f)
  }
  cache = { byId, childrenByParent, all: data.features, at: Date.now() }
  return cache
}

export const toRegion = (idx: Index, f: GeoFeature): GeoRegion => ({
  id: f.properties.id,
  name: f.properties.name,
  parent: f.properties.parent ?? null,
  pbfUrl: f.properties.urls?.pbf ?? null,
  hasChildren: (idx.childrenByParent.get(f.properties.id)?.length ?? 0) > 0,
  geometry: f.geometry,
})

export const childrenOf = (idx: Index, id: string): GeoFeature[] => idx.childrenByParent.get(id || "__root__") ?? []

const norm = (s: string) => s.toLowerCase().replace(/<[^>]*>/g, " ").replace(/[^a-z0-9]+/g, " ").trim()
// Генерик-токены различают плохо (у всех округов есть «federal district») — их не считаем за совпадение.
// Общие слова, которые НЕ различают регион (у многих есть «federal district» / «islands»). Направления
// (north/south/…) НЕ включаем: они различительны (South ≠ Volga federal district; south↔southern-фикс).
const STOP = new Set(["federal", "district", "region", "state", "oblast", "province", "zone", "and", "of", "the", "city",
  "islands", "island", "isle", "isles", "republic", "federation", "county", "area"])
const tokens = (s: string) => norm(s).split(" ").filter(Boolean)
// Два токена совпадают, если один — префикс другого (мин. 4 буквы у короткого): south↔southern, kaliningrad↔kaliningrad.
const tokMatch = (a: string, b: string) => a === b || (a.length >= 4 && b.startsWith(a)) || (b.length >= 4 && a.startsWith(b))

// Найти лучшее совпадение среди ЗАДАННОГО набора фич по РАЗЛИЧИТЕЛЬНЫМ токенам (не генерик-словам). Так
// «Southern Federal District» (ИИ) матчится к «South Federal District» (каталог) по токену south↔southern,
// а не проваливается в фолбэк. Возвращает фичу с наибольшим числом совпавших различительных токенов (>=1).
export function bestMatch(features: GeoFeature[], query: string): GeoFeature | null {
  const q = norm(query)
  if (!q) return null
  const qTokAll = tokens(query)
  const qKey = qTokAll.filter((x) => !STOP.has(x))
  let best: GeoFeature | null = null, bestScore = 0
  for (const f of features) {
    const n = norm(f.properties.name)
    if (n === q) return f // точное совпадение имени — сразу
    const fKey = tokens(f.properties.name).filter((x) => !STOP.has(x))
    let score = 0
    for (const qt of qKey) if (fKey.some((ft) => tokMatch(qt, ft))) score++
    // подстрока целиком (короткое имя внутри длинного) — тоже сигнал
    if (score === 0 && (n.includes(q) || q.includes(n))) score = 0.5
    if (score > bestScore) { bestScore = score; best = f }
  }
  return bestScore >= 0.5 ? best : null
}

// Найти страну верхнего уровня (или крупную единицу) по имени, по всему индексу.
export function findCountry(idx: Index, name: string): GeoFeature | null {
  return bestMatch(idx.all, name)
}

// СВЕРКА С ЦЕЛЫМ КАТАЛОГОМ по названию региона — сердце «части 2» (чекбоксы). Ищет по ВСЕМУ индексу (не
// только среди детей страны), поэтому находит регионы с «неожиданным» родителем — напр. «Canary Islands»
// живёт под `africa`, а не под `spain`. Возвращает совпадения от самого точного к более общим:
//   1) точное совпадение имени; 2) имя каталога содержит запрос целиком (или наоборот); 3) токенное
// совпадение по различительным словам. Короче имя ⇒ выше (более конкретный регион). Дубли по id снимаются.
export function catalogMatches(idx: Index, term: string): GeoFeature[] {
  const q = norm(term)
  if (!q) return []
  const scored: { f: GeoFeature; score: number }[] = []
  const seen = new Set<string>()
  const qKey = tokens(term).filter((x) => !STOP.has(x))
  for (const f of idx.all) {
    const id = f.properties.id
    if (seen.has(id)) continue
    const n = norm(f.properties.name)
    let score = 0
    if (n === q) score = 100
    else if (n.includes(q) || q.includes(n)) score = 50 - Math.abs(n.length - q.length) / 10
    else {
      const fKey = tokens(f.properties.name).filter((x) => !STOP.has(x))
      let hit = 0
      for (const qt of qKey) if (fKey.some((ft) => tokMatch(qt, ft))) hit++
      if (hit > 0 && qKey.length > 0) score = 10 * (hit / qKey.length)
    }
    if (score > 0) { scored.push({ f, score }); seen.add(id) }
  }
  scored.sort((a, b) => b.score - a.score || a.f.properties.name.length - b.f.properties.name.length)
  if (scored.length === 0) return []
  // Если есть СИЛЬНОЕ совпадение (точное имя=100 или вхождение≈50) — отдаём только сильные, отсекая слабый
  // токенный шум (South Federal District → НЕ тянет US South / South Korea). Иначе — только токенные.
  const best = scored[0].score
  const keep = best >= 50 ? scored.filter((s) => s.score >= 50) : scored
  return keep.map((s) => s.f)
}
