import fs from "fs";
import path from "path";
import type { I18nMap } from "@/lib/per-lang";
import type { NavState, NavItem, NavSlot, RouteCandidate, RouteNode } from "./types";

// Серверная половина раздела «Верхнее меню».
//
// 🔒 ХРАНИЛИЩЕ — `APP-CONFIG/app-config.json`, ветка `nav`. Причина выбора
// записана в приложении (`lib/menu/nav-config.ts`) и повторена здесь коротко:
// файл принадлежит панели и лежит ВНЕ git, поэтому развёртывание его не затрёт,
// а соседний `PLATFORM-CONFIG` отслеживается git и рискует потерять правки при
// слиянии. Плюс в этом файле уже живут переводы `i18n.<путь>.<язык>`, которыми
// переводятся подписи кнопок.

const APP_DIR = process.env.APP_DIR ?? "/opt/fractera/app";
const CONFIG_PATH =
  process.env.APP_CONFIG_PATH ?? path.join(APP_DIR, "APP-CONFIG", "app-config.json");

function readConfig(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as Record<string, unknown>;
  } catch {
    // Файла нет — владелец ещё не сохранял настройки. Это состояние, не ошибка.
    return {};
  }
}

export function readNav(slot: NavSlot): NavState {
  const nav = (readConfig().nav ?? {}) as Record<string, unknown>;
  const side = nav.authSide;
  const list = nav[slot];
  return {
    items: Array.isArray(list) ? (list as NavItem[]) : [],
    authSide: side === "left" || side === "right" ? side : "right",
    configured: Array.isArray(list),
  };
}

/**
 * Умолчания подвала — ТЕ ЖЕ, что показывает сайт, пока владелец не высказался.
 *
 * 🔒 ЧИТАЮТСЯ ИЗ ИСХОДНИКА СЛОТА, А НЕ ХРАНЯТСЯ КОПИЕЙ. Список живёт в
 * `lib/menu/nav-config.ts` гостевого приложения. Копия здесь разошлась бы с ним
 * молча — при первом же изменении шаблона панель начала бы показывать один
 * подвал, а посетитель видеть другой. Разбор текстом — тот же приём, которым
 * панель уже достаёт заголовки страниц, и по той же причине: код слота нам не
 * принадлежит и может не собираться.
 *
 * 🔒 ЗАЧЕМ ЭТО ВООБЩЕ НУЖНО. Панель обязана показывать ДЕЙСТВИТЕЛЬНОСТЬ. Пока
 * она показывала только собственный конфиг, на сайте стояли четыре ссылки, а
 * раздел писал «Ссылок пока нет» — и предлагал владельцу управлять пустотой.
 *
 * Порядок в файле = порядок на сайте, поэтому он сохраняется как есть.
 */
export function slotFooterDefaults(): NavItem[] {
  const src = (() => {
    try {
      return fs.readFileSync(path.join(APP_DIR, "lib", "menu", "nav-config.ts"), "utf-8");
    } catch {
      return "";
    }
  })();

  const block = src.match(/DEFAULT_FOOTER[^=]*=\s*\[([\s\S]*?)\]/)?.[1] ?? "";
  const items: NavItem[] = [];
  for (const m of block.matchAll(/\{[^}]*?id:\s*["']([^"']+)["'][^}]*?href:\s*["']([^"']+)["'][^}]*?label:\s*["']([^"']*)["'][^}]*?\}/g)) {
    items.push({ id: m[1], href: m[2], order: (items.length + 1) * 10, label: m[3] });
  }
  return items;
}

/**
 * Переводы подписей — та же ветка `i18n`, что и у пяти полей настроек.
 *
 * 🔒 ХРАНИЛИЩЕ ОБЩЕЕ НАМЕРЕННО. Подпись кнопки — такое же поле на язык, как имя
 * приложения, и заводить ей отдельный склад значило бы иметь два механизма
 * перевода в одном файле. Ключ — `nav.top.<id>.label`, ровно его читает
 * приложение (`lib/menu/nav-config.ts`).
 */
export function readNavI18n(): I18nMap {
  const i18n = readConfig().i18n;
  return (i18n && typeof i18n === "object" ? i18n : {}) as I18nMap;
}

/**
 * Записать ветку `nav`, НЕ ПОТЕРЯВ остальной конфиг.
 *
 * 🔒 Читаем-правим-пишем целиком: файл общий с разделом настроек приложения, и
 * запись одной ветки поверх всего файла стёрла бы имя сайта, SEO и переводы.
 */
// 🔒 ЗАПИСЬ ПРИНИМАЕТ МЕНЬШЕ, ЧЕМ ОТДАЁТ ЧТЕНИЕ (шаг 526). `NavState` несёт ещё и
// `configured` — «высказывался ли владелец». Это ФАКТ О ФАЙЛЕ, вывод чтения, и
// записывать его нельзя: он появляется сам, ровно в тот момент, когда ветка
// слота оказывается в файле. Принимать его аргументом значило бы разрешить
// вызывающему солгать о состоянии диска.
export function writeNav(
  slot: NavSlot,
  next: Pick<NavState, "items" | "authSide">,
  i18n?: I18nMap,
): void {
  const config = readConfig();
  config.nav = { ...(config.nav as object ?? {}), [slot]: next.items, authSide: next.authSide };

  // 🔒 ПЕРЕВОДЫ ЧУЖИХ ПОЛЕЙ НЕ ТРОГАЕМ. В ветке `i18n` живут ещё и переводы имени
  // приложения, описания и SEO. Записать сюда только свои ключи значило бы стереть
  // их — и владелец обнаружил бы пропажу на другой странице, не связав с этой.
  if (i18n) {
    const prev = (config.i18n ?? {}) as I18nMap;
    const merged: I18nMap = { ...prev };
    const mine = `nav.${slot}.`;
    for (const key of Object.keys(prev)) if (key.startsWith(mine)) delete merged[key];
    for (const [key, value] of Object.entries(i18n)) if (key.startsWith(mine)) merged[key] = value;
    config.i18n = merged;
  }

  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

// ── Публичные маршруты приложения ────────────────────────────────────────────
//
// 🔒 ТОЛЬКО ПУБЛИЧНЫЕ (решение владельца). Кнопка, ведущая на страницу, куда
// посетителя не пустят, — обещание, которого интерфейс не сдержит. Признак
// защищённой страницы структурный, а не по имени: всё, что лежит внутри группы
// прав `(protectedLayer)`, отбрасывается целиком.
//
// Приём сканирования тот же, что у `lib/product-docs.ts` (`listSteps`) и у
// `lib/menu/group-menus.ts` в приложении: читаем дерево на диске, ничего не
// импортируя из слота — его код нам не принадлежит и может не собираться.

const LANG_ROOT = path.join(APP_DIR, "app", "[lang]");
const SKIP_SEGMENT = (name: string) =>
  name.startsWith("_") || name.startsWith("[") || name.startsWith(".");

function titleFrom(dirPath: string, segment: string): string {
  // Заголовок берётся из данных страницы, если они есть: `products` человеку
  // говорит меньше, чем «Каталог продуктов».
  for (const file of ["en.ts", "meta.ts"]) {
    try {
      const raw = fs.readFileSync(path.join(dirPath, "_data", file), "utf-8");
      const m = raw.match(/title:\s*['"]([^'"]+)['"]/);
      if (m?.[1]) return m[1];
    } catch {
      /* нет данных — идём дальше */
    }
  }
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Умолчания ВЕРХНЕГО меню — то, что показывает шапка сайта, пока владелец не
 * высказался.
 *
 * 🔒 У ДВУХ СЛОТОВ РАЗНЫЕ ИСТОЧНИКИ УМОЛЧАНИЙ, и это не небрежность. Подвал
 * держит список в одном месте (`DEFAULT_FOOTER`), а верхнее меню собирается из
 * МАНИФЕСТОВ ГРУПП: каждая группа сама объявляет, идёт ли она в шапку и с каким
 * порядком (`_data/group.ts` → `menus.top.enabled/order`). Спрашивать про
 * верхнее меню там же, где про подвал, значит получить пустоту и решить, что
 * меню пусто, — ровно та ошибка, из-за которой панель показывала «ссылок нет»
 * при живом меню на сайте.
 *
 * 🔒 ГЛУБИНА НЕ УГАДЫВАЕТСЯ. Манифесты лежат внутри слоёв — например
 * `app/[lang]/(publicLayer)/products/_data/group.ts`. Поиск по фиксированной
 * глубине уже дважды за день давал «ничего не найдено» там, где всё на месте.
 */
export function slotTopDefaults(lang: string): NavItem[] {
  const found: { slug: string; dir: string; order: number }[] = [];

  const scan = (dir: string, depth: number): void => {
    if (depth > 4) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith(".")) continue;
      if (e.name.includes("protected")) continue;
      const child = path.join(dir, e.name);
      const manifest = path.join(child, "_data", "group.ts");
      if (fs.existsSync(manifest)) {
        const src = (() => { try { return fs.readFileSync(manifest, "utf-8"); } catch { return ""; } })();
        const slug = src.match(/slug:\s*['"]([^'"]+)['"]/)?.[1] ?? e.name;
        const top = src.match(/top:\s*\{\s*enabled:\s*(true|false)\s*,\s*order:\s*(\d+)/);
        if (top?.[1] === "true") found.push({ slug, dir: child, order: Number(top[2]) });
      }
      if (e.name.startsWith("_")) continue; // служебные папки внутрь не ведут
      scan(child, depth + 1);
    }
  };
  scan(LANG_ROOT, 0);

  // Подпись — та же, что рисует сайт: `eyebrow` языковой ячейки, затем
  // английской, затем сам слаг человеческим написанием.
  const labelOf = (dir: string, slug: string): string => {
    for (const l of [lang, "en"]) {
      try {
        const m = fs.readFileSync(path.join(dir, "_data", `${l}.ts`), "utf-8").match(/eyebrow:\s*['"]([^'"]+)['"]/);
        if (m?.[1]) return m[1];
      } catch { /* ячейки нет — идём дальше */ }
    }
    return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return found
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug))
    .map((g, i) => ({ id: g.slug, href: `/${g.slug}`, order: (i + 1) * 10, label: labelOf(g.dir, g.slug) }));
}

/**
 * Собрать ДЕРЕВО маршрутов, повторяющее структуру папок.
 *
 * 🔒 ДЕРЕВО, А НЕ ПЛОСКИЙ СПИСОК (решение владельца 2026-08-12). Плоский
 * перечень десятков адресов заставляет читать каждую строку, чтобы понять, где
 * что лежит; структура сайта в нём не видна, хотя именно она и есть та карта, по
 * которой человек выбирает пункты меню.
 *
 * 🔒 ПАПКИ-ГРУППЫ В СКОБКАХ ПРОЗРАЧНЫ ДЛЯ АДРЕСА, поэтому и в дереве их нет:
 * `(marketing)/blog` — это `/blog`, и показывать посреди карты сегмент, которого
 * нет в адресе, значит учить человека неверной структуре. `(protectedLayer)`
 * отбрасывается целиком: его страницы посетителю недоступны.
 *
 * Узел без собственной страницы остаётся в дереве папкой без кнопки «плюс» —
 * по нему нельзя перейти, но внутри могут лежать те, по которым можно.
 */
function walk(dir: string, prefix: string, depth: number): RouteNode[] {
  if (depth > 4) return [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const nodes: RouteNode[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const name = e.name;

    if (name.startsWith("(") && name.endsWith(")")) {
      if (name.includes("protected")) continue;
      // Прозрачная группа: её дети поднимаются на место самой группы.
      nodes.push(...walk(path.join(dir, name), prefix, depth));
      continue;
    }
    if (SKIP_SEGMENT(name)) continue;

    const child = path.join(dir, name);
    const href = `${prefix}/${name}`;
    const hasPage = fs.existsSync(path.join(child, "page.tsx"));
    const children = walk(child, href, depth + 1);
    if (!hasPage && children.length === 0) continue; // пустая папка ни о чём не говорит

    nodes.push({
      segment: name,
      href: hasPage ? href : null,
      title: titleFrom(child, name),
      children,
    });
  }

  return nodes.sort((a, b) => a.segment.localeCompare(b.segment));
}

/** Дерево публичных маршрутов слота — карта, по которой собирают меню. */
export function publicRouteTree(): RouteNode[] {
  // Главная страница языка папкой не представлена, но пунктом меню быть вправе.
  return [{ segment: "/", href: "/", title: "Home", children: [] }, ...walk(LANG_ROOT, "", 0)];
}

/**
 * Дерево страниц ОДНОЙ группы маршрутов — для раздела подвала.
 *
 * 🔒 ЗАЧЕМ СУЖЕНИЕ (владелец, 2026-08-12). В подвал идут страницы подвала, а не
 * весь сайт: показывать там каталог товаров и посты блога значит заставить
 * человека искать три нужные строки среди десятков посторонних. Верхнее меню,
 * наоборот, вправе вести куда угодно — там дерево остаётся полным.
 *
 * Папка группы читается напрямую, поэтому в дереве оказываются ровно её
 * страницы; скобки в адрес не входят, и адреса получаются короткими
 * (`/privacy`), как и на сайте.
 */
export function groupRouteTree(group: string): RouteNode[] {
  const dir = findGroupDir(LANG_ROOT, group, 0);
  return dir ? walk(dir, "", 0) : [];
}

/**
 * Найти папку группы `(<group>)` где угодно под `app/[lang]`.
 *
 * 🔒 ПОЧЕМУ ПОИСК, А НЕ ОДИН ПУТЬ (шаг 524, найдено на живом сервере). Здесь
 * стояло `path.join(LANG_ROOT, "(footerPages)")` — то есть предполагалось, что
 * группа лежит непосредственно под `[lang]`. В шаблоне слота она вложена:
 * `app/[lang]/(publicLayer)/(footerPages)`. Папки по искомому пути нет,
 * `readdirSync` бросает, `walk` возвращает пустой список — и раздел «Страницы
 * подвала» открывался ПУСТЫМ при пяти готовых страницах в проекте. Ошибки не
 * было нигде: ни исключения, ни строки в логе, ни красного гейта. Владелец
 * просто не мог поставить в подвал ни одной страницы.
 *
 * Спускаемся только в папки-группы: обычный сегмент сайта группой маршрутов не
 * является, и заходить в него значит искать `(footerPages)` внутри `/blog`.
 * Глубина ограничена: вложенность групп в проекте измеряется единицами, а
 * неограниченный обход дерева на каждый показ страницы — плата ни за что.
 */
function findGroupDir(dir: string, group: string, depth: number): string | null {
  if (depth > 3) return null;
  const target = `(${group})`;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const name = e.name;
    if (name === target) return path.join(dir, name);
    // Та же граница, что и внутри `walk`: защищённые страницы посетителю
    // недоступны, и предлагать их для подвала нельзя.
    if (!name.startsWith("(") || !name.endsWith(")") || name.includes("protected")) continue;
    const found = findGroupDir(path.join(dir, name), group, depth + 1);
    if (found) return found;
  }
  return null;
}

/** Плоский перечень — нужен, чтобы отличить уже добавленные адреса от новых. */
export function flattenRoutes(nodes: RouteNode[], out: RouteCandidate[] = []): RouteCandidate[] {
  for (const n of nodes) {
    if (n.href) out.push({ href: n.href, title: n.title });
    flattenRoutes(n.children, out);
  }
  return out;
}
