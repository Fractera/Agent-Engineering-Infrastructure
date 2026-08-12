import fs from "fs";
import path from "path";
import type { NavState, NavItem, RouteCandidate } from "./types";

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

export function readNav(): NavState {
  const nav = (readConfig().nav ?? {}) as Record<string, unknown>;
  const side = nav.authSide;
  return {
    top: Array.isArray(nav.top) ? (nav.top as NavItem[]) : [],
    authSide: side === "left" || side === "right" ? side : "right",
  };
}

/**
 * Записать ветку `nav`, НЕ ПОТЕРЯВ остальной конфиг.
 *
 * 🔒 Читаем-правим-пишем целиком: файл общий с разделом настроек приложения, и
 * запись одной ветки поверх всего файла стёрла бы имя сайта, SEO и переводы.
 */
export function writeNav(next: NavState): void {
  const config = readConfig();
  config.nav = { ...(config.nav as object ?? {}), top: next.top, authSide: next.authSide };
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

function walk(dir: string, prefix: string, out: RouteCandidate[], depth: number): void {
  if (depth > 3) return; // глубже меню всё равно не показывает
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const name = e.name;

    // Группы прав в скобках: `(protectedLayer)` отбрасывается целиком вместе с
    // потомками, остальные скобочные группы прозрачны для адреса.
    if (name.startsWith("(") && name.endsWith(")")) {
      if (name.includes("protected")) continue;
      walk(path.join(dir, name), prefix, out, depth);
      continue;
    }
    if (SKIP_SEGMENT(name)) continue;

    const child = path.join(dir, name);
    const href = `${prefix}/${name}`;
    if (fs.existsSync(path.join(child, "page.tsx"))) {
      out.push({ href, title: titleFrom(child, name) });
    }
    walk(child, href, out, depth + 1);
  }
}

/** Публичные маршруты слота, пригодные в кнопки меню. */
export function listPublicRoutes(): RouteCandidate[] {
  const out: RouteCandidate[] = [];
  walk(LANG_ROOT, "", out, 0);
  // Главная страница языка — законный пункт меню и папкой не представлена.
  out.unshift({ href: "/", title: "Home" });
  return out.sort((a, b) => a.href.localeCompare(b.href));
}
