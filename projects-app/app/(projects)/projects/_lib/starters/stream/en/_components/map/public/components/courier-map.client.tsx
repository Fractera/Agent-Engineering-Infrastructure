"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { courierStrings } from "./courier-i18n";

// КУРЬЕР-ПЛАНИРОВЩИК — продуктовая поверхность карты (закон владельца): интерактив живёт здесь, где агент
// правит его по заявке. НАСТОЯЩАЯ зумируемая карта на Leaflet (перетаскивание, колесо-зум) поверх тайлов
// OpenStreetMap. Leaflet грузится ДИНАМИЧЕСКИ внутри эффекта — он трогает `window`, поэтому на сервере не
// исполняется (SSR-безопасно); типы берутся `import type` (стираются при сборке).
//
// ДВА СПОСОБА поставить точку:
//   • КЛИК по карте — сразу, без геокодинга (работает всегда);
//   • по АДРЕСУ — через дверь `api/geo` → сервис fractera-geo (когда геокодер готов).
// Первая точка = депо (старт). «Построить маршрут» зовёт optimize (TSP на дорожной матрице) → порядок +
// геометрия + км; бензин = км×расход/100×цена (настройки топлива из конфига geo).
type Pt = { lat: number; lon: number; name: string };
type Result = { order: number[]; geometry: { coordinates: [number, number][] }; totalKm: number; totalMin: number };
type Fuel = { consumption: number; price: number; currency: string };
const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";
const PARIS: [number, number] = [48.8566, 2.3522];

export default function CourierMapClient({ lang }: { lang: string }) {
  const t = courierStrings(lang);
  const [points, setPoints] = useState<Pt[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [fuel, setFuel] = useState<Fuel | null>(null);
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState<"geo" | "route" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef = useRef<any>(null);
  const markersRef = useRef<LayerGroup | null>(null);
  const routeRef = useRef<LayerGroup | null>(null);

  // Добавить точку. Стабильна через ref, чтобы обработчик клика Leaflet всегда видел свежую версию.
  const addPoint = useCallback((lat: number, lon: number, name?: string) => {
    setPoints((p) => [...p, { lat, lon, name: name || `${t.point} ${p.length + 1}` }]);
    setResult(null);
  }, [t.point]);
  const addPointRef = useRef(addPoint);
  addPointRef.current = addPoint;

  // Инициализация карты один раз (клиент-only: Leaflet грузится динамически). Начальный вид — АКТИВНЫЙ регион
  // гео-сервиса (config.center/bbox из `api/geo`), а не фиксированный Париж: при смене региона (напр. Канары)
  // карта открывается там, где реально лежат данные маршрутизации. Фолбэк — Париж, если конфиг недоступен.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [L, cfg] = await Promise.all([
        import("leaflet").then((m) => m.default),
        fetch(`${apiBase()}/geo`).then((r) => r.json()).then((d) => d.config as { center?: [number, number]; bbox?: number[] } | null).catch(() => null),
      ]);
      if (cancelled || !mapEl.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(mapEl.current);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(map);
      const bbox = Array.isArray(cfg?.bbox) && cfg!.bbox!.length === 4 ? (cfg!.bbox as number[]) : null;
      const center = Array.isArray(cfg?.center) && cfg!.center!.length === 2 ? (cfg!.center as [number, number]) : PARIS;
      if (bbox) map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { maxZoom: 13 });
      else map.setView(center, 11);
      map.on("click", (e) => addPointRef.current(e.latlng.lat, e.latlng.lng));
      markersRef.current = L.layerGroup().addTo(map);
      routeRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    })();
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  // Перерисовка пинов и маршрута при изменении точек/результата.
  useEffect(() => {
    const L = LRef.current, map = mapRef.current, markers = markersRef.current, route = routeRef.current;
    if (!L || !map || !markers || !route) return;
    markers.clearLayers();
    route.clearLayers();
    points.forEach((p, i) => {
      const pos = result ? result.order.indexOf(i) : -1;
      const depot = i === 0;
      const label = pos >= 0 ? String(pos + 1) : depot ? "★" : "•";
      const bg = depot ? "#059669" : "#2563eb";
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${bg};color:#fff;width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.45);border:2px solid #fff"><span style="transform:rotate(45deg);font-size:12px;font-weight:700;line-height:1">${label}</span></div>`,
        iconSize: [24, 24], iconAnchor: [12, 24],
      });
      L.marker([p.lat, p.lon], { icon }).addTo(markers).bindTooltip(p.name);
    });
    if (result) {
      const line = result.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);
      L.polyline(line, { color: "#2563eb", weight: 4, opacity: 0.85 }).addTo(route);
    }
    if (points.length) {
      const b = L.latLngBounds(points.map((p) => [p.lat, p.lon] as [number, number]));
      map.fitBounds(b.pad(0.3), { maxZoom: 15 });
    }
  }, [points, result]);

  const geo = async (op: string, payload: object) => {
    const r = await fetch(`${apiBase()}/geo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...payload }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "geo error");
    return j;
  };

  const addByAddress = async () => {
    const q = address.trim();
    if (!q) return;
    setBusy("geo"); setError(null);
    try {
      const j = await geo("geocode", { q });
      addPoint(j.lat, j.lon, j.name?.split(",")[0] || q);
      setAddress("");
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg.includes("unavailable") ? t.geoDown : msg);
    } finally { setBusy(null); }
  };

  const removePoint = (i: number) => { setPoints((p) => p.filter((_, k) => k !== i)); setResult(null); };
  const clearAll = () => { setPoints([]); setResult(null); setError(null); };

  const build = async () => {
    if (points.length < 2) { setError(t.emptyHint); return; }
    setBusy("route"); setError(null);
    try {
      const [opt, cfg] = await Promise.all([
        geo("optimize", { coords: points.map((p) => ({ lat: p.lat, lon: p.lon })) }),
        fetch(`${apiBase()}/geo`).then((r) => r.json()).then((d) => d.config as Fuel | null).catch(() => null),
      ]);
      setResult(opt); setFuel(cfg && "consumption" in cfg ? cfg : null);
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg.includes("unavailable") ? t.geoDown : msg);
    } finally { setBusy(null); }
  };

  const posInOrder = (i: number) => (result ? result.order.indexOf(i) : -1);
  const litres = result && fuel ? (result.totalKm * fuel.consumption) / 100 : null;
  const cost = litres && fuel ? litres * fuel.price : null;

  return (
    <div className="space-y-3" data-map-view="courier">
      <header className="space-y-0.5">
        <h3 className="text-sm font-semibold">{t.title}</h3>
        <p className="text-xs text-muted-foreground">{t.subtitle}</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Input value={address} onChange={(e) => setAddress(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addByAddress(); }} placeholder={t.addressPh} className="max-w-[14rem]" />
        <Button variant="secondary" size="sm" onClick={addByAddress} disabled={busy === "geo"}>{busy === "geo" ? "…" : t.addByAddress}</Button>
        <Button size="sm" onClick={build} disabled={busy === "route" || points.length < 2}>{busy === "route" ? t.building : t.build}</Button>
        {points.length > 0 ? <Button variant="ghost" size="sm" onClick={clearAll}>{t.clear}</Button> : null}
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {points.length === 0 ? <p className="text-xs text-muted-foreground">{t.clickHint}</p> : null}

      {points.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {points.map((p, i) => {
            const pos = posInOrder(i);
            return (
              <li key={`${p.lat}-${p.lon}-${i}`} className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-xs">
                <span className="font-medium">{pos >= 0 ? `${pos + 1}. ` : ""}{p.name}</span>
                {i === 0 ? <span className="text-muted-foreground">({t.depot})</span> : null}
                <button type="button" onClick={() => removePoint(i)} aria-label={t.remove} className="text-muted-foreground hover:text-foreground"><X className="size-3" /></button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* НАСТОЯЩАЯ карта Leaflet — видна всегда, тянется и зумится. */}
      <div ref={mapEl} className="w-full overflow-hidden rounded-lg border" style={{ height: 420 }} />

      {result ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label={t.distance} value={`${result.totalKm.toFixed(1)} km`} />
          <Stat label={t.duration} value={`${result.totalMin.toFixed(0)} min`} />
          {litres != null ? <Stat label={t.fuel} value={`${litres.toFixed(1)} ${t.litres}`} /> : null}
          {cost != null && fuel ? <Stat label={t.cost} value={`${cost.toFixed(2)} ${fuel.currency}`} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}
