import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/require-auth";

// УДАЛЕНИЕ СТРАНИЦЫ ПОДВАЛА — ЦЕЛИКОМ ИЛИ НИКАК (шаг 527).
//
// 🔒 ПАПКИ НЕДОСТАТОЧНО, И ЭТО НЕ ПРИДИРКА. Страница подвала зарегистрирована в
// ТРЁХ местах вне своей папки, и одно из них — статический импорт:
//
//   lib/aio/surfaces.ts   import { data as privacyData } from '…/(footerPages)/privacy/_data'
//   app/sitemap.ts        FOOTER_PAGES = ["/privacy", …]
//   lib/menu/nav-config.ts DEFAULT_FOOTER = [{ id: "privacy", … }]
//
// Снести папку и оставить импорт значит оставить проект НЕСОБИРАЕМЫМ: следующая
// сборка упадёт на неразрешённом модуле, и владелец узнает об этом не здесь, а
// при развёртывании. Поэтому дверь либо убирает всё четыре следа, либо не
// трогает ничего.
//
// 🔒 ЭТО ПРАВКА КОДА, И ОНА НАЗЫВАЕТСЯ СВОИМ ИМЕНЕМ. Панель страницы не создаёт —
// их строит агент в проекте. Удаление же владелец потребовал явно, и прятать его
// нельзя: кнопка «убрать из подвала» и кнопка «удалить страницу» обязаны быть
// разными кнопками с разными последствиями. Диалог перед удалением говорит, что
// исчезнут файлы, а не ссылка.

export const dynamic = "force-dynamic";

const APP_DIR = process.env.APP_DIR ?? "/opt/fractera/app";
const GROUP = path.join(APP_DIR, "app", "[lang]", "(publicLayer)", "(footerPages)");

/** Сегмент страницы: только строчные буквы, цифры и дефис. */
const SEGMENT = /^[a-z0-9][a-z0-9-]{0,60}$/;

/** Убрать строки, в которых встречается признак, и сказать, сколько убрано. */
function dropLines(file: string, matches: (line: string) => boolean): number {
  let src: string;
  try {
    src = fs.readFileSync(file, "utf-8");
  } catch {
    return 0;
  }
  const lines = src.split(/\r?\n/);
  const kept = lines.filter((l) => !matches(l));
  if (kept.length === lines.length) return 0;
  fs.writeFileSync(file, kept.join(src.includes("\r\n") ? "\r\n" : "\n"), "utf-8");
  return lines.length - kept.length;
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let href = "";
  try {
    const body = (await req.json()) as { href?: unknown };
    href = typeof body.href === "string" ? body.href.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const segment = href.replace(/^\/+|\/+$/g, "");
  // 🔒 ГРАНИЦА ПРОВЕРЯЕТСЯ ФОРМОЙ, А НЕ ДОВЕРИЕМ. Сегмент уходит в путь на диске,
  // и `../` в нём стёр бы что угодно за пределами группы. Плюс отдельная сверка
  // разрешённого пути после `resolve` — на случай, если форма чего-то не поймала.
  if (!SEGMENT.test(segment)) return NextResponse.json({ ok: false, reason: "bad-segment" });

  const dir = path.resolve(GROUP, segment);
  if (path.dirname(dir) !== path.resolve(GROUP)) {
    return NextResponse.json({ ok: false, reason: "outside-group" });
  }
  if (!fs.existsSync(path.join(dir, "page.tsx"))) {
    return NextResponse.json({ ok: false, reason: "not-found" });
  }

  const route = `/${segment}`;
  const removed: Record<string, number> = {};

  try {
    // Сперва регистрации, потом папка. Порядок содержательный: упади мы на
    // регистрациях, папка ещё на месте и проект собирается — то есть неудача
    // оставляет рабочее состояние, а не половину удаления.
    removed.surfaces = dropLines(
      path.join(APP_DIR, "lib", "aio", "surfaces.ts"),
      (l) => l.includes(`(footerPages)/${segment}/_data`) || new RegExp(`\\[\\s*\\w+Data\\s*,\\s*['"]${route}['"]`).test(l),
    );
    // `FOOTER_PAGES` — ОДНА строка со всеми адресами, поэтому здесь вырезается
    // не строка целиком, а элемент внутри неё.
    const sitemapFile = path.join(APP_DIR, "app", "sitemap.ts");
    try {
      const src = fs.readFileSync(sitemapFile, "utf-8");
      const next = src.replace(
        /(const FOOTER_PAGES\s*=\s*\[)([^\]]*)(\])/,
        (_m, head: string, body: string, tail: string) => {
          const kept = body
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s && s.replace(/['"]/g, "") !== route);
          removed.sitemap = 1;
          return `${head}${kept.join(", ")}${tail}`;
        },
      );
      if (next !== src) fs.writeFileSync(sitemapFile, next, "utf-8");
      else removed.sitemap = 0;
    } catch {
      removed.sitemap = 0;
    }

    // Умолчание подвала — по одному объекту на строку.
    removed.defaults = dropLines(
      path.join(APP_DIR, "lib", "menu", "nav-config.ts"),
      (l) => new RegExp(`id:\\s*['"]${segment}['"]`).test(l) && l.includes(`href: `),
    );

    fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: "failed", detail: String(e).slice(0, 200) });
  }

  // Пересборка нужна: удалили ФАЙЛЫ, а отдаёт страницы собранный `.next`.
  return NextResponse.json({ ok: true, route, removed, rebuildRequired: true });
}
