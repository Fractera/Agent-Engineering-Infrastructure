"use client";

import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3 — breaking this breaks the whole chain, FORBIDDEN):
// VIEW file — never import admin/ or another entity. Enforced by `npm run check:entity-imports`.
//
// THE MAP — VIEW CORE (step 254.8c, owner's spec): a REAL open-data map (OpenStreetMap tiles — open
// access, attribution below), showing five European capitals as pins. Clicking a pin slides a drawer in
// from the right with the city's one-line note ("Париж — столица Франции"); nothing more lives in the
// drawer yet, by design. Self-contained: the tile grid + Web-Mercator pin math are computed here — no
// map library, no build-time dependency; only the public OSM tile servers at render time.
type City = { name: string; note: string; lat: number; lon: number };

const CITIES: City[] = [
  { name: "Париж", note: "Париж — столица Франции.", lat: 48.8566, lon: 2.3522 },
  { name: "Лондон", note: "Лондон — столица Великобритании.", lat: 51.5074, lon: -0.1278 },
  { name: "Берлин", note: "Берлин — столица Германии.", lat: 52.52, lon: 13.405 },
  { name: "Рим", note: "Рим — столица Италии.", lat: 41.9028, lon: 12.4964 },
  { name: "Мадрид", note: "Мадрид — столица Испании.", lat: 40.4168, lon: -3.7038 },
];

// The fixed Europe window: zoom-4 OSM tiles x 7..9, y 4..6 (a 3×3 grid = 768×768 world pixels), which
// covers Madrid to London comfortably. Web-Mercator: worldPx = ((lon+180)/360)·2^z·256 etc.
const Z = 4;
const TILE = 256;
const X0 = 7, X1 = 9, Y0 = 4, Y1 = 6;

function worldPx(lon: number): number {
  return ((lon + 180) / 360) * Math.pow(2, Z) * TILE;
}
function worldPy(lat: number): number {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2) * Math.pow(2, Z) * TILE;
}

export function EuropeMapView() {
  const [active, setActive] = useState<City | null>(null);

  const pins = useMemo(
    () =>
      CITIES.map((c) => ({
        ...c,
        left: worldPx(c.lon) - X0 * TILE,
        top: worldPy(c.lat) - Y0 * TILE,
      })),
    [],
  );

  const tiles: { x: number; y: number }[] = [];
  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) tiles.push({ x, y });
  const W = (X1 - X0 + 1) * TILE;
  const H = (Y1 - Y0 + 1) * TILE;

  return (
    <div className="space-y-1" data-map-view="europe">
      <div className="relative w-full overflow-hidden rounded-lg border" style={{ aspectRatio: `${W} / ${H}` }}>
        <div className="absolute inset-0">
          {tiles.map((t) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${t.x}-${t.y}`}
              src={`https://tile.openstreetmap.org/${Z}/${t.x}/${t.y}.png`}
              alt=""
              className="absolute select-none"
              draggable={false}
              style={{
                left: `${(((t.x - X0) * TILE) / W) * 100}%`,
                top: `${(((t.y - Y0) * TILE) / H) * 100}%`,
                width: `${(TILE / W) * 100}%`,
                height: `${(TILE / H) * 100}%`,
              }}
            />
          ))}
          {pins.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setActive(c)}
              className="group absolute -translate-x-1/2 -translate-y-full"
              style={{ left: `${(c.left / W) * 100}%`, top: `${(c.top / H) * 100}%` }}
              title={c.name}
              data-map-pin={c.name}
            >
              <MapPin className="size-6 fill-primary/80 text-primary drop-shadow group-hover:scale-110" />
              <span className="absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap rounded bg-background/90 px-1 text-[10px] font-medium shadow-sm">
                {c.name}
              </span>
            </button>
          ))}
        </div>
      </div>
      <p className="text-right text-[10px] text-muted-foreground">© OpenStreetMap contributors</p>

      {/* The right-side drawer (owner's spec): one line per city, nothing more for now. */}
      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent side="right" data-map-drawer={active?.name ?? ""}>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <MapPin className="size-4" /> {active?.name}
            </SheetTitle>
            <SheetDescription>{active?.note}</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </div>
  );
}
