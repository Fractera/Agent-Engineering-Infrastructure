import express from 'express'
import cors from 'cors'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

// fractera-geo — ГЕОСЕРВИС ПЛАТФОРМЫ (PM2-процесс, :3400). «Мозг карт»: один сервис на все автоматизации
// (как fractera-data :3300 / fractera-rag :9621), а не по сервису на карту. Всё своё, бесплатно, без чужих
// ключей — self-host на открытых данных OpenStreetMap.
//
// Это ТОНКИЙ ФАСАД: наружу отдаёт стабильный контракт /geo/*, а тяжёлые движки крутятся на localhost за ним:
//   • OSRM (osrm-routed, профиль car, :5000) — маршрут, матрица N×N, оптимизация тура (TSP через /trip);
//   • Nominatim (:8080, PostgreSQL+PostGIS)   — геокодинг адрес → координаты.
// Слушает 127.0.0.1: зовут его только процессы этого же сервера (projects-app, MCP). В secure-режиме внешний
// доступ — за nginx auth_request (см. ARCHITECTURE §3).
//
// Конфиг (регион, провайдер, дефолты топлива) пишет служебная страница Admin :3002 (OpenMap-настройки) в
// geo-config.json — единственный источник истины; здесь он только читается.
const __dirname = dirname(fileURLToPath(import.meta.url))

const PORT          = Number(process.env.PORT ?? 3400)
const HOST          = process.env.GEO_HOST ?? '127.0.0.1'
const OSRM_URL      = process.env.OSRM_URL ?? 'http://localhost:5000'
const NOMINATIM_URL = process.env.NOMINATIM_URL ?? 'http://localhost:8080'
const CONFIG_PATH   = process.env.GEO_CONFIG_PATH ?? resolve(__dirname, 'geo-config.json')
const STATUS_PATH   = process.env.GEO_STATUS_PATH ?? resolve(__dirname, 'geo-provision-status.json')
const PROVISION_SH  = resolve(__dirname, 'provision-region.sh')

// Дефолты, если Admin ещё не записал конфиг.
//
// РЕГИОН ПО УМОЛЧАНИЮ ПУСТ (шаг 501, решение владельца 2026-08-08). Прежде здесь
// стоял 'ile-de-france', и это была ложь на каждом новом сервере: установщик
// действительно готовил Иль-де-Франс всем — ~10 ГБ диска (892 МБ выгрузки OSRM +
// 7,2 ГБ базы адресов Nominatim) и минуты установки за карту Парижа, которая
// клиенту в Бразилии не нужна. Планету поставить нельзя (порядка терабайта),
// поэтому ЛЮБОЙ предустановленный регион — угадывание чужой географии.
//
// Теперь движки ставятся без данных, а регион выбирает владелец на странице
// настроек карты — помощник по регионам сверяет выбор с живым каталогом
// Geofabrik и честно показывает размер и время. Пустая строка = «регион не
// выбран», и страница говорит именно это, а не рисует ложную готовность.
//
// `center`/`bbox` оставлены прежними намеренно: это лишь стартовый вид карты до
// первого провижина, и провижин перезаписывает их из заголовка PBF.
const DEFAULT_CONFIG = {
  region: '',                                               // пусто = регион ещё не выбран
  provider: 'self',                                         // 'self' (fractera-geo) | 'external' (ключ)
  externalKey: '',
  fuel: { consumption: 8, price: 1.9, currency: 'EUR' },    // л/100км, цена/литр
  center: [48.8566, 2.3522],                               // [lat,lon] — стартовый вид до провижининга
  bbox: [48.12, 1.44, 49.24, 3.56],                        // [minLat,minLon,maxLat,maxLon]
}
const readConfig = () => {
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) } }
  catch { return DEFAULT_CONFIG }
}
// Санитизация правки конфига — принимаем только известные поля, чужого не пишем (единственный источник — этот файл).
const sanitizeConfig = (body, cur) => ({
  region: typeof body?.region === 'string' && body.region.trim() ? body.region.trim() : cur.region,
  provider: body?.provider === 'external' ? 'external' : 'self',
  externalKey: typeof body?.externalKey === 'string' ? body.externalKey : cur.externalKey,
  fuel: {
    consumption: Number.isFinite(body?.fuel?.consumption) ? Number(body.fuel.consumption) : cur.fuel.consumption,
    price: Number.isFinite(body?.fuel?.price) ? Number(body.fuel.price) : cur.fuel.price,
    currency: typeof body?.fuel?.currency === 'string' && body.fuel.currency.trim() ? body.fuel.currency.trim() : cur.fuel.currency,
  },
  // center/bbox пишет провижининг региона (provision-region.sh); правка настроек (провайдер/топливо) их НЕ трогает.
  center: Array.isArray(body?.center) && body.center.length === 2 ? body.center.map(Number) : cur.center,
  bbox: Array.isArray(body?.bbox) && body.bbox.length === 4 ? body.bbox.map(Number) : cur.bbox,
})

// OSRM ждёт координаты как "lon,lat;lon,lat;…" (долгота первой — легко ошибиться).
const osrmCoords = (coords) => coords.map((c) => `${c.lon},${c.lat}`).join(';')
const isPoints = (v) => Array.isArray(v) && v.every((c) => c && Number.isFinite(c.lat) && Number.isFinite(c.lon))

// TSP — НАШ расчёт, не движок (OSRM /trip не работает с алгоритмом MLD). Открытый путь с ФИКСИРОВАННЫМ
// стартом (индекс 0 = депо), минимизируем суммарную метрику стоимости (для «минимума бензина» это дорожное
// РАССТОЯНИЕ). Малый набор — точный перебор (N−1)! (5 точек = 24 варианта); большой — жадный nearest-neighbor
// + 2-opt. `cost` — матрица NxN из OSRM /table.
function bestOrder(cost) {
  const n = cost.length
  const rest = [...Array(n).keys()].slice(1)
  const pathCost = (o) => { let s = 0; for (let i = 0; i < o.length - 1; i++) s += cost[o[i]][o[i + 1]]; return s }
  if (rest.length <= 9) {
    let best = [0, ...rest], bestSum = Infinity
    const permute = (arr, cur) => {
      if (arr.length === 0) {
        const sum = pathCost([0, ...cur])
        if (sum < bestSum) { bestSum = sum; best = [0, ...cur] }
        return
      }
      for (let i = 0; i < arr.length; i++) permute([...arr.slice(0, i), ...arr.slice(i + 1)], [...cur, arr[i]])
    }
    permute(rest, [])
    return best
  }
  // большой набор — жадный старт + улучшение 2-opt
  let order = [0]; const used = new Set([0])
  while (order.length < n) {
    const last = order[order.length - 1]; let nb = -1, nd = Infinity
    for (let j = 0; j < n; j++) if (!used.has(j) && cost[last][j] < nd) { nd = cost[last][j]; nb = j }
    order.push(nb); used.add(nb)
  }
  let improved = true
  while (improved) {
    improved = false
    for (let i = 1; i < order.length - 1; i++) for (let k = i + 1; k < order.length; k++) {
      const cand = [...order.slice(0, i), ...order.slice(i, k + 1).reverse(), ...order.slice(k + 1)]
      if (pathCost(cand) < pathCost(order)) { order = cand; improved = true }
    }
  }
  return order
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

// health — живой статус движков (это же читает страница настроек Admin).
app.get('/geo/health', async (_req, res) => {
  const cfg = readConfig()
  const up = async (url) => {
    try { const r = await fetch(url, { signal: AbortSignal.timeout(3000) }); return r.ok } catch { return false }
  }
  const osrm = await up(`${OSRM_URL}/nearest/v1/car/2.3522,48.8566`) // Париж — точка проверки
  const geocoder = await up(`${NOMINATIM_URL}/status?format=json`)
  res.json({ ok: osrm && geocoder, osrm, geocoder, region: cfg.region, provider: cfg.provider })
})

// config: единственный источник настроек geo (регион/провайдер/топливо). Читает фасад, пишет Admin :3002
// (страница OpenMap-настроек проксирует сюда — geo-сервис владеет своим конфигом, а не Admin-процесс).
app.get('/geo/config', (_req, res) => res.json(readConfig()))
app.post('/geo/config', (req, res) => {
  try { const next = sanitizeConfig(req.body, readConfig()); writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2)); res.json(next) }
  catch { res.status(500).json({ error: 'cannot write config' }) }
})

// provision — РЕАЛЬНАЯ смена региона: запускает тяжёлую фоновую загрузку+обработку карты (provision-region.sh)
// и сразу отвечает; страница настроек следит за прогрессом через /geo/provision-status. Один регион за раз.
const readStatus = () => { try { return JSON.parse(readFileSync(STATUS_PATH, 'utf8')) } catch { return { state: 'idle' } } }
app.get('/geo/provision-status', (_req, res) => res.json(readStatus()))
app.post('/geo/provision', (req, res) => {
  const regionId = String(req.body?.regionId ?? '').trim()
  // Одна или НЕСКОЛЬКО карт (отмеченные чекбоксы) — несколько склеиваются osmium'ом в один датасет.
  const urls = Array.isArray(req.body?.pbfUrls) ? req.body.pbfUrls.map(String) : (req.body?.pbfUrl ? [String(req.body.pbfUrl)] : [])
  const okUrls = urls.every((u) => /^https:\/\/download\.geofabrik\.de\/.+\.osm\.pbf$/.test(u))
  if (!regionId || !/^[a-z0-9-]+$/.test(regionId) || urls.length === 0 || !okUrls) {
    return res.status(400).json({ error: 'regionId (a-z0-9-) and one+ geofabrik.de pbf urls are required' })
  }
  const cur = readStatus()
  if (cur.state === 'downloading' || cur.state === 'processing') {
    return res.status(409).json({ error: `already provisioning "${cur.region}" (${cur.step})` })
  }
  writeFileSync(STATUS_PATH, JSON.stringify({ region: regionId, state: 'downloading', step: 'starting', at: new Date().toISOString() }))
  // Отвязанный фоновый процесс: переживает ответ, пишет прогресс в статус-файл сам. Аргументы: id + N url'ов.
  const child = spawn('bash', [PROVISION_SH, regionId, ...urls], {
    detached: true, stdio: 'ignore',
    env: { ...process.env, GEO_STATUS_PATH: STATUS_PATH, GEO_CONFIG_PATH: CONFIG_PATH },
  })
  child.unref()
  res.json({ ok: true, region: regionId, state: 'downloading' })
})

// geocode: адрес → координаты (Nominatim).
app.post('/geo/geocode', async (req, res) => {
  const q = String(req.body?.q ?? '').trim()
  if (!q) return res.status(400).json({ error: 'q is required' })
  try {
    const r = await fetch(`${NOMINATIM_URL}/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
      { headers: { 'User-Agent': 'fractera-geo' }, signal: AbortSignal.timeout(8000) })
    const j = await r.json()
    if (!Array.isArray(j) || j.length === 0) return res.status(404).json({ error: 'address not found' })
    res.json({ lat: Number(j[0].lat), lon: Number(j[0].lon), name: j[0].display_name })
  } catch { res.status(502).json({ error: 'geocoder unavailable' }) }
})

// matrix: N×N дорожные расстояния (м) и времена (с) — сырьё для TSP (OSRM /table).
app.post('/geo/matrix', async (req, res) => {
  const coords = req.body?.coords
  if (!isPoints(coords) || coords.length < 2) return res.status(400).json({ error: 'coords: >= 2 points {lat,lon}' })
  try {
    const r = await fetch(`${OSRM_URL}/table/v1/car/${osrmCoords(coords)}?annotations=distance,duration`,
      { signal: AbortSignal.timeout(15000) })
    const j = await r.json()
    if (j.code !== 'Ok') return res.status(502).json({ error: j.message || 'osrm error' })
    res.json({ distances: j.distances, durations: j.durations })
  } catch { res.status(502).json({ error: 'router unavailable' }) }
})

// route: геометрия + длина маршрута в ЗАДАННОМ порядке точек (OSRM /route).
app.post('/geo/route', async (req, res) => {
  const coords = req.body?.coords
  if (!isPoints(coords) || coords.length < 2) return res.status(400).json({ error: 'coords: >= 2 points {lat,lon}' })
  try {
    const r = await fetch(`${OSRM_URL}/route/v1/car/${osrmCoords(coords)}?overview=full&geometries=geojson`,
      { signal: AbortSignal.timeout(15000) })
    const j = await r.json()
    if (j.code !== 'Ok') return res.status(502).json({ error: j.message || 'osrm error' })
    const route = j.routes[0]
    res.json({ geometry: route.geometry, distanceKm: route.distance / 1000, durationMin: route.duration / 60 })
  } catch { res.status(502).json({ error: 'router unavailable' }) }
})

// optimize: курьерский TSP. Старт фиксирован = первая точка (депо). Считаем в ТРИ шага, все на MLD:
//   1) матрица дорожных РАССТОЯНИЙ N×N (OSRM /table) — бензин ∝ расстояние;
//   2) НАШ TSP по матрице (bestOrder) — оптимальный порядок объезда;
//   3) геометрия маршрута в этом порядке (OSRM /route) — линия на карту + итоговые км.
app.post('/geo/optimize', async (req, res) => {
  const coords = req.body?.coords
  if (!isPoints(coords) || coords.length < 2) return res.status(400).json({ error: 'coords: >= 2 points {lat,lon}' })
  try {
    const mr = await fetch(`${OSRM_URL}/table/v1/car/${osrmCoords(coords)}?annotations=distance`, { signal: AbortSignal.timeout(15000) })
    const mj = await mr.json()
    if (mj.code !== 'Ok') return res.status(502).json({ error: mj.message || 'osrm table error' })
    const order = bestOrder(mj.distances)
    const ordered = order.map((i) => coords[i])
    const rr = await fetch(`${OSRM_URL}/route/v1/car/${osrmCoords(ordered)}?overview=full&geometries=geojson`, { signal: AbortSignal.timeout(15000) })
    const rj = await rr.json()
    if (rj.code !== 'Ok') return res.status(502).json({ error: rj.message || 'osrm route error' })
    const route = rj.routes[0]
    res.json({ order, geometry: route.geometry, totalKm: route.distance / 1000, totalMin: route.duration / 60 })
  } catch { res.status(502).json({ error: 'router unavailable' }) }
})

app.listen(PORT, HOST, () => console.log(`fractera-geo on ${HOST}:${PORT} (osrm ${OSRM_URL}, nominatim ${NOMINATIM_URL})`))
