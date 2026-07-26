# Tool: map / geo — maps, routing, address search and courier optimization

A ready-made capability for building **map-related automations** (courier routes, delivery, points on a map,
address lookup). **It already exists — never write a second map renderer, routing math, TSP solver, or a
tiles/geocoding integration.** When an automation needs maps or routes, wire THIS.

## What it is
The platform runs a self-hosted geo service **`fractera-geo`** (`:3400`, loopback) — a facade over OSRM
(routing) + Nominatim (address geocoding) on free OpenStreetMap data, no third-party keys. The automation
reaches it through a **folder-local door**, and renders with the existing map component.

The courier example (already built): the owner drops stops on the map (or by address) → the service returns the
least-fuel visiting order (TSP) → the map draws the route and shows distance / time / fuel / cost.

## Where it lives (this folder — law 0, self-contained)
- **The door (call this, never `:3400` directly):** `api/geo/route.ts`. A public component reaches the geo
  service ONLY through this door, so the folder stays portable (a network call, not an external import).
- **The map UI:** `_components/map/public/components/courier-map.client.tsx` — a real, zoomable Leaflet map
  (pan / wheel-zoom) over OpenStreetMap tiles; pins, an SVG route polyline, click-to-add-stop and add-by-address.
  Reuse or adapt this; don't start a new map from scratch.
- **For agents (MCP):** `geo-bridge` (`geo_geocode` / `geo_matrix` / `geo_route` / `geo_optimize`) — the same
  capability as tools, callable by a coding agent building the automation.

## API — the door `api/geo`
```
GET  api/geo                              -> { config }   // fuel defaults + active region
POST api/geo { op:"geocode",  q }         -> { lat, lon, name }
POST api/geo { op:"matrix",   coords[] }  -> { distances, durations }        // road N×N, metres/seconds
POST api/geo { op:"route",    coords[] }  -> { geometry, distanceKm, durationMin }  // in given order
POST api/geo { op:"optimize", coords[] }  -> { order[], geometry, totalKm, totalMin }  // courier TSP, first = depot
```
`coords` is `[{ lat, lon }, …]`. Fuel = `totalKm × consumption/100 × price` — a caller calculation, using the
fuel defaults from `config` (an automation node, NOT the geo service).

## The active region
The geo service holds ONE region's map at a time (or a merge of several). The owner chooses it in the Admin
panel → **Settings → Map settings** (a Region assistant: describe the places in words → checkboxes of available
Geofabrik regions → download). Coordinates/routes only resolve inside the loaded region. The automation does not
change the region — it consumes whatever region is active.

## Constraints
- The door returns `{ error }` (HTTP 502) when the `maps` component is off or the region is still importing —
  handle it gracefully (show a hint, don't crash), exactly as the courier map does.
- Address search (`geocode`) is live only after the region's import finishes; routing (`matrix`/`route`/
  `optimize`) is live as soon as OSRM is ready. Until then, dropping pins by map click still works.
- The map is self-hosted OpenStreetMap tiles + Leaflet — no API key. Keep attribution "© OpenStreetMap".
