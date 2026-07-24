"use client";

import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// КАРТА — РАНТАЙМ (public), перенос v1 `entities/map/view/europe-map.tsx` один-в-один (шаг 298).
//
// НАСТОЯЩАЯ карта на открытых данных OpenStreetMap: тайл-сетка + Web-Mercator математика посчитаны ПРЯМО
// ЗДЕСЬ — без картографической библиотеки и без build-зависимости; в рантайме тянутся только публичные
// OSM-тайл-серверы. Это соблюдает закон 0: папка самодостаточна и уезжает ZIP-архивом.
//
// Пять столиц Европы пинами; клик по пину выдвигает справа `Sheet` с однострочной заметкой города —
// больше в ящике пока ничего нет, по замыслу. Города и заметки — ДАННЫЕ демо-карты (рабочий пример),
// агент правит их по заявке «строить вместе с ИИ»; поэтому они не в i18n-словаре.
//
// 🔒 shadcn: пин — `Button` (сырой `<button>` из v1 заменён), ящик — `Sheet`, иконка — lucide `MapPin`.
type City = { name: string; note: string; lat: number; lon: number };

const CITIES: City[] = [
  { name: "Париж", note: "Париж — столица Франции.", lat: 48.8566, lon: 2.3522 },
  { name: "Лондон", note: "Лондон — столица Великобритании.", lat: 51.5074, lon: -0.1278 },
  { name: "Берлин", note: "Берлин — столица Германии.", lat: 52.52, lon: 13.405 },
  { name: "Рим", note: "Рим — столица Италии.", lat: 41.9028, lon: 12.4964 },
  { name: "Мадрид", note: "Мадрид — столица Испании.", lat: 40.4168, lon: -3.7038 },
];

// Фиксированное окно Европы: тайлы OSM зума 4, x 7..9, y 4..6 (сетка 3×3 = 768×768 мировых пикселей),
// покрывает от Мадрида до Лондона. Web-Mercator: worldPx = ((lon+180)/360)·2^z·256 и т.д.
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
            // ПИН — `Button` с СОБСТВЕННЫМ боксом клика (`size-6`). Важно: shadcn Button ставит дочернему
            // svg `pointer-events-none`, поэтому клик по иконке ловит именно кнопка, а не тайл под ней — без
            // реального бокса (был `size-auto p-0`) клик проваливался сквозь пин, и ящик не открывался.
            <Button
              key={c.name}
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setActive(c)}
              className="group absolute size-6 -translate-x-1/2 -translate-y-full rounded-full bg-transparent p-0 hover:bg-transparent"
              title={c.name}
              data-map-pin={c.name}
              style={{ left: `${(c.left / W) * 100}%`, top: `${(c.top / H) * 100}%` }}
            >
              <MapPin className="!size-6 fill-primary/80 text-primary drop-shadow transition-transform group-hover:scale-110" />
              <span className="absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap rounded bg-background/90 px-1 text-[10px] font-medium shadow-sm">
                {c.name}
              </span>
            </Button>
          ))}
        </div>
      </div>
      <p className="text-right text-[10px] text-muted-foreground">© OpenStreetMap contributors</p>

      {/* Правый ящик (замысел владельца): одна строка на город, больше пока ничего. */}
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
