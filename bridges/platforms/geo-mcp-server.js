import { createServer } from 'http'
import { handleMcpHandshake } from './mcp-handshake.js'

// ── Geo MCP server (L2, port 3232) ──────────────────────────────────────────
// Singleton MCP server (not platform-bound) exposing the platform geo service
// `fractera-geo` (:3400, loopback) to agents as tools: address geocoding, an
// N×N road matrix, a route, and courier TSP optimization. Read-only — it never
// mutates; it asks the geo engines (OSRM + Nominatim on OpenStreetMap data).
//
// WHY IT EXISTS: an agent (Hermes OR any single coding agent building a map
// automation, e.g. the in-product coder) needs "address → coordinates" and
// "order these stops for the least fuel" without reimplementing routing. By the
// self-sufficiency doctrine (ARCHITECTURE §"Agent self-sufficiency") this MCP is
// registered in EVERY agent's .mcp.json, not only Hermes' config.yaml — a project
// with a single Codex must keep maps.
//
// The geo service may be OFF (the `maps` component is optional): every tool then
// returns a plain { error } instead of throwing, so the agent hears "maps are not
// enabled" rather than a crash. → MCP-REGISTRY §24, ARCHITECTURE §3.1.
const GEO = process.env.GEO_SERVICE_URL ?? 'http://127.0.0.1:3400'

function textResult(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] }
}

async function geoPost(path, payload) {
  try {
    const r = await fetch(`${GEO}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    })
    return await r.json()
  } catch {
    return { error: 'geo service unavailable — the "maps" component may be off' }
  }
}

function toolsSchema() {
  const coords = {
    type: 'array',
    description: 'Ordered list of points, each {lat, lon} in decimal degrees.',
    items: { type: 'object', properties: { lat: { type: 'number' }, lon: { type: 'number' } }, required: ['lat', 'lon'] },
  }
  return [
    {
      name: 'geo_geocode',
      description:
        'Turn a free-form ADDRESS into coordinates {lat, lon, name} using the self-hosted Nominatim ' +
        'geocoder on OpenStreetMap data. Use this first when an automation is given addresses, before ' +
        'routing. Bounded to the imported region (default Île-de-France / Paris). Returns { error } if the ' +
        'address is not found or the geo service is off.',
      inputSchema: { type: 'object', properties: { q: { type: 'string', description: 'The address, e.g. "Tour Eiffel, Paris".' } }, required: ['q'] },
    },
    {
      name: 'geo_matrix',
      description:
        'Road DISTANCE (metres) and DURATION (seconds) matrix between every pair of the given points ' +
        '(OSRM /table). This is the raw material for choosing an order — distances follow real streets, ' +
        'not straight lines. >= 2 points.',
      inputSchema: { type: 'object', properties: { coords }, required: ['coords'] },
    },
    {
      name: 'geo_route',
      description:
        'Route geometry and totals for the points IN THE GIVEN ORDER (OSRM /route): { geometry (GeoJSON ' +
        'LineString), distanceKm, durationMin }. Use when the order is already decided and you want the ' +
        'line + length. >= 2 points.',
      inputSchema: { type: 'object', properties: { coords }, required: ['coords'] },
    },
    {
      name: 'geo_optimize',
      description:
        'Courier TSP: the optimal ORDER to visit the points for the least road distance (min fuel), with ' +
        'the FIRST point fixed as the start (depot). Returns { order (indexes into the input), geometry, ' +
        'totalKm, totalMin }. Fuel/cost is a caller calculation: litres = totalKm × consumption/100 (the ' +
        'consumption/price defaults live in the geo config). >= 2 points.',
      inputSchema: { type: 'object', properties: { coords }, required: ['coords'] },
    },
  ]
}

export class GeoMcpServer {
  constructor({ port, secret }) {
    this.port = Number(port)
    this.secret = secret
  }

  start() {
    const server = createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Access-Control-Allow-Origin', '*')
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

      if (this.secret) {
        const auth = req.headers['authorization'] ?? ''
        if (!auth.startsWith('Bearer ') || auth.slice(7) !== this.secret) {
          res.writeHead(401); res.end(JSON.stringify({ error: 'Unauthorized' })); return
        }
      }

      if (req.method === 'GET' && req.url === '/health') {
        res.end(JSON.stringify({ ok: true, server: 'geo' })); return
      }
      if (req.method !== 'POST') { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return }

      let body = ''
      req.on('data', c => { body += c })
      req.on('end', () => {
        try { this._handle(JSON.parse(body), res) }
        catch { res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' })) }
      })
    })
    server.listen(this.port, '127.0.0.1', () => console.log(`[mcp:geo] http://127.0.0.1:${this.port}`))
  }

  _handle(rpc, res) {
    const { id, method, params } = rpc
    const ok = r => res.end(JSON.stringify({ jsonrpc: '2.0', id, result: r }))
    const fail = (c, m) => res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: c, message: m } }))

    if (handleMcpHandshake(rpc, res, 'fractera-geo-bridge')) return
    if (method === 'tools/list') return ok({ tools: toolsSchema() })
    if (method === 'tools/call') return this._call(params?.name, params?.arguments ?? {}).then(ok).catch(e => fail(-32603, e.message))
    fail(-32601, `Method not found: ${method}`)
  }

  async _call(name, args) {
    switch (name) {
      case 'geo_geocode':  return textResult(await geoPost('/geo/geocode', { q: String(args.q ?? '') }))
      case 'geo_matrix':   return textResult(await geoPost('/geo/matrix', { coords: args.coords ?? [] }))
      case 'geo_route':    return textResult(await geoPost('/geo/route', { coords: args.coords ?? [] }))
      case 'geo_optimize': return textResult(await geoPost('/geo/optimize', { coords: args.coords ?? [] }))
      default: throw new Error(`Unknown tool: ${name}`)
    }
  }
}
