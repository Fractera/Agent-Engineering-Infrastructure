// Серверное чтение геосервиса (шаг 501, Ф2, партия 7).
//
// Единственный источник настроек карты — сам `fractera-geo` (:3400). Панель их не
// хранит и не дублирует, она спрашивает.
//
// Что читает сервер: живут ли движки, какой регион активен, идёт ли загрузка.
// Что остаётся браузеру: беседа о регионе, карта Leaflet и выбор чекбоксами —
// это взаимодействие, его без JS не сделать.

const GEO = process.env.GEO_SERVICE_URL ?? "http://localhost:3400";

const ask = (path: string) =>
  fetch(`${GEO}${path}`, { cache: "no-store", signal: AbortSignal.timeout(6000) }).then((r) => r.json());

export type GeoConfig = { region: string; provider: string; center?: [number, number] } | null;
export type GeoHealth = { ok: boolean; osrm: boolean; geocoder: boolean };
export type GeoProvision = { state: string; region?: string; step?: string };

export type GeoState = {
  reachable: boolean;
  config: GeoConfig;
  health: GeoHealth;
  provision: GeoProvision;
};

export async function readGeoState(): Promise<GeoState> {
  // Три запроса разом: они независимы, и последовательное ожидание втрое дольше
  // без всякой причины.
  const [config, health, provision] = await Promise.all([
    ask("/geo/config").catch(() => null),
    ask("/geo/health").catch(() => null),
    ask("/geo/provision-status").catch(() => null),
  ]);

  // «Служба не ответила» и «движки лежат» — разные вещи, и полоса показаний
  // обязана их различать.
  const reachable = health !== null || config !== null;

  return {
    reachable,
    config: config as GeoConfig,
    health: (health as GeoHealth) ?? { ok: false, osrm: false, geocoder: false },
    provision: (provision as GeoProvision) ?? { state: "idle" },
  };
}
