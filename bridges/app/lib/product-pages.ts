// План страниц против факта (владелец 2026-08-16).
//
// 🔒 ЗАЧЕМ ДВА РАЗНЫХ ЗНАНИЯ. `PAGES.md` — НАМЕРЕНИЕ: какие страницы продукт
// должен получить, судя по кейсам. Что построено на самом деле — ФАКТ, и его
// нельзя хранить: список файлов есть производное от файловой системы, и
// записанный руками он разойдётся с ней в первую неделю (агент создал страницу,
// файл не тронул). Поэтому факт СЧИТАЕТСЯ обходом папок при каждом показе.
//
// Расхождение между ними и есть ответ на вопрос «что ещё не сделано» — тот
// самый, которого сегодня нет ни у владельца, ни у агента.
//
// 🔒 ПОЧЕМУ СКАН, А НЕ ДОВЕРИЕ АГЕНТУ. Агент может забыть отчитаться, может
// ошибиться, может построить страницу и назвать её иначе. Файловая система не
// забывает и не ошибается: она — единственный источник, который нельзя
// рассинхронизировать с самим собой.
//
// ⚠️ СЕГОДНЯ ЭТОТ МОДУЛЬ НИКТО НЕ ЗОВЁТ, И ЭТО ОСОЗНАННО (владелец 2026-08-16).
// Отчёт показывался на странице кейсов сразу под опросом и был оттуда снят:
// человеку, только что ответившему на вопросы, он говорил «плана пока нет» и тут
// же вываливал полтора десятка служебных маршрутов стартера в разделе
// «построено, но в плане не значится». Сведение «план против факта» имеет смысл
// только когда есть план; до этого оно показывает разницу с пустотой.
//
// Владелец сказал дословно: убрать из интерфейса, из логики не убирать. Модуль
// оставлен целым и рабочим — он понадобится, когда для отчёта найдётся своё
// место: отдельный раздел или показ по запросу, а не первый экран после опроса.
// Разбор снятия — в комментарии на месте показа, `doc-use-cases/page.tsx`.

import fs from "fs";
import path from "path";
import type { Product } from "@/lib/products-config";
import { listProducts } from "@/lib/products-config";

const APP_DIR = process.env.APP_DIR ?? "/opt/fractera/app";
const ROUTES_ROOT = path.join(APP_DIR, "app", "[lang]");

/** Файлы, которые в Next делают папку СТРАНИЦЕЙ, а не просто папкой. */
const PAGE_FILES = ["page.tsx", "page.ts", "page.jsx", "page.js", "page.mdx"];

/**
 * Приводит записи плана и факта к одному виду.
 *
 * Динамический сегмент модель пишет как угодно — `[slug]`, `:slug`, `{slug}`, —
 * а Next всегда как `[slug]`. Сравнивать их как строки значило бы объявить
 * построенную страницу непостроенной из-за скобок.
 */
export function normalizeRoute(route: string): string {
  const clean = route.trim().split("?")[0].split("#")[0];
  const parts = clean.split("/").filter(Boolean).map((seg) => {
    if (/^\[.+\]$/.test(seg) || /^:.+/.test(seg) || /^\{.+\}$/.test(seg)) return "[*]";
    return seg.toLowerCase();
  });
  return "/" + parts.join("/");
}

/**
 * Все построенные маршруты слота.
 *
 * 🔒 ГРУППЫ МАРШРУТОВ НЕ ДАЮТ СЕГМЕНТА. Реальный слот разложен по слоям доступа:
 * `(publicLayer)/products/page.tsx` — это адрес `/products`, а не
 * `/(publicLayer)/products`. Пропустить это правило значит объявить непостроенным
 * ВСЁ приложение сразу.
 *
 * Так же пропускаются служебные папки: `_components` (приватные, маршрутами не
 * становятся никогда) и `@slot` (параллельные слоты — они рендерятся внутри
 * чужого маршрута, своего адреса у них нет).
 */
export function scanBuiltRoutes(): string[] {
  const found: string[] = [];

  const walk = (dir: string, urlParts: string[]) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    if (entries.some((e) => e.isFile() && PAGE_FILES.includes(e.name))) {
      found.push("/" + urlParts.join("/"));
    }

    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const name = e.name;
      if (name.startsWith("_") || name.startsWith("@") || name === "node_modules") continue;
      // Группа маршрутов: папка есть, сегмента нет.
      const isGroup = name.startsWith("(") && name.endsWith(")");
      walk(path.join(dir, name), isGroup ? urlParts : [...urlParts, name]);
    }
  };

  walk(ROUTES_ROOT, []);
  return [...new Set(found)];
}

export type PagePlanRow = {
  route: string;
  purpose: string;
  built: boolean;
};

export type PagesReport = {
  /** Есть ли вообще план: без него сравнивать не с чем, и это не поломка. */
  hasPlan: boolean;
  rows: PagePlanRow[];
  /** Построено, но в плане не значится — не ошибка, а повод обновить план. */
  extra: string[];
  plannedCount: number;
  builtCount: number;
};

/**
 * Разбор `PAGES.md`.
 *
 * Читаем строки таблицы, а не весь markdown: файл человеческий, владелец правит
 * его свободно, и разбирать его строгим форматом значило бы ломаться от лишнего
 * абзаца. Строка без адреса в обратных кавычках просто не считается записью.
 */
export function parsePagesPlan(text: string): { route: string; purpose: string }[] {
  const rows: { route: string; purpose: string }[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    const routeCell = cells.find((c) => /^`.+`$/.test(c));
    if (!routeCell) continue;
    const route = routeCell.replace(/`/g, "").trim();
    if (!route.startsWith("/")) continue;
    const purpose = cells[cells.indexOf(routeCell) + 1] ?? "";
    rows.push({ route, purpose });
  }
  return rows;
}

/**
 * Какие маршруты принадлежат ЭТОМУ продукту.
 *
 * Продукт на сегменте владеет своим поддеревом. Корневой владеет всем
 * остальным — но не тем, что занято соседями: иначе владелец корня видел бы
 * чужие страницы как свои «лишние» и пошёл бы их удалять.
 */
function ownsRoute(product: Product, route: string, others: Product[]): boolean {
  const own = normalizeRoute(product.route || "/");
  if (own !== "/") return route === own || route.startsWith(own + "/");
  const foreign = others
    .filter((p) => p.id !== product.id && p.route && p.route !== "/")
    .map((p) => normalizeRoute(p.route));
  return !foreign.some((f) => route === f || route.startsWith(f + "/"));
}

export function pagesReport(product: Product, planText: string): PagesReport {
  const planned = parsePagesPlan(planText);
  const others = listProducts();
  const built = scanBuiltRoutes()
    .map(normalizeRoute)
    .filter((r) => ownsRoute(product, r, others));
  const builtSet = new Set(built);

  const rows: PagePlanRow[] = planned.map((row) => ({
    route: row.route,
    purpose: row.purpose,
    built: builtSet.has(normalizeRoute(row.route)),
  }));

  const plannedSet = new Set(planned.map((r) => normalizeRoute(r.route)));
  const extra = built.filter((r) => !plannedSet.has(r)).sort();

  return {
    hasPlan: planned.length > 0,
    rows,
    extra,
    plannedCount: planned.length,
    builtCount: rows.filter((r) => r.built).length,
  };
}
