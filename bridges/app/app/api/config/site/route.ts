import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/require-auth";
import { applyDerivedAddresses } from "@/lib/public-app-url";
import { revalidateShell } from "@/lib/revalidate-shell";

// Read/write the Shell's live site config (branding / SEO / PWA / images). The config is a
// JSON file on disk in the Shell's working dir (/opt/fractera/app/APP-CONFIG/app-config.json),
// read server-side by app/config/app-config.ts. Editing here is the same cross-process write
// pattern as the Env panel writing /opt/fractera/app/.env.local. The Shell deep-merges what we
// write over its code defaults, so a partial object is fine. Applies without a rebuild (the
// Shell renders the config at runtime); a save shows up on the next page load.
const CONFIG_PATH =
  process.env.APP_CONFIG_PATH ?? "/opt/fractera/app/APP-CONFIG/app-config.json";

// Best-effort: purge the Shell's (:3000) ISR cache after a save so the change shows on
// the next page load instead of waiting out revalidate=600. Same trigger the App Settings
// MCP fires — both write paths behave identically. Fire-and-forget: never fail/delay the
// save. The Shell pages stay static; this only purges cache. → step 134 part C.


export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // The locked addresses are shown as this server RESOLVES them, not as the file last
    // recorded them: a fresh server has no file at all, and after a domain change the stored
    // value is a day out of date. Deriving on read means the panel never displays an address
    // the deployment does not answer on.
    if (!fs.existsSync(CONFIG_PATH)) return NextResponse.json({ config: applyDerivedAddresses({}) });
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return NextResponse.json({ config: applyDerivedAddresses(JSON.parse(raw)) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// 🔒 «ВЕРХНЕЕ МЕНЮ» — ЧУЖАЯ ВЕТКА, И ЭТО СОХРАНЕНИЕ ЕЁ НЕ ТРОГАЕТ (владелец
// 2026-08-14, после разбора пропавшего меню на живом проекте).
//
// Эта страница отправляет весь `config`, который держит в памяти браузера, —
// включая то, что сама никогда не редактировала (`nav`, переводы подписей
// меню `i18n["nav.*"]`). Обычно это безобидно: React-состояние стартует с
// полного снимка файла и просто везёт его туда-обратно.
//
// НО: снимок сделан в момент открытия вкладки. Если в СОСЕДНЕЙ вкладке за это
// время правят «Верхнее меню» — их сохранение уходит первым и пишет файл на
// диске, — а потом отправляется это, устаревшее, оно ЗАТИРАЕТ то сохранение
// своим более старым состоянием. Разбор не нашёл прямых следов этой гонки на
// сервере (файл создался пустым при активации домена, до какого-либо
// сохранения меню), но раз она возможна — владелец просил её закрыть, а не
// дожидаться повторной пропажи.
//
// Лечение: ветки чужих владельцев берутся С ДИСКА в момент записи, а не из
// присланного снимка. Что бы ни лежало в памяти вкладки настроек — на диске
// остаётся последнее, что реально сохранило «Верхнее меню».
const FOREIGN_TOP_KEYS = ["nav"] as const;

function preserveForeignBranches(
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  let onDisk: Record<string, unknown> = {};
  try {
    onDisk = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as Record<string, unknown>;
  } catch {
    return incoming; // файла ещё нет — сохранять поверх нечего
  }

  const out: Record<string, unknown> = { ...incoming };
  for (const key of FOREIGN_TOP_KEYS) if (key in onDisk) out[key] = onDisk[key];

  // Переводы подписей меню живут ВНУТРИ общей ветки `i18n`, ключами вида
  // `nav.<slot>.<id>.label` — тот же приём, что использует `writeNav()`:
  // сохраняем эти ключи с диска, остальной `i18n` (свои поля формы) берём из
  // присланного.
  const diskI18n = (onDisk.i18n ?? {}) as Record<string, unknown>;
  const incomingI18n = (out.i18n ?? {}) as Record<string, unknown>;
  const mergedI18n: Record<string, unknown> = { ...incomingI18n };
  for (const k of Object.keys(diskI18n)) if (k.startsWith("nav.")) mergedI18n[k] = diskI18n[k];
  out.i18n = mergedI18n;

  return out;
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { config } = (await req.json()) as { config: unknown };
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const preserved = preserveForeignBranches(config as Record<string, unknown>);
    // Site URL / canonical base / sitemap URL are overwritten with what this server actually
    // answers on. Enforced HERE and not in the form: the form is one writer among several
    // (the settings MCP writes the same file), and a rule that lives in a form is a rule the
    // next writer skips — which is precisely how these three stayed empty until now.
    const withAddresses = applyDerivedAddresses(preserved);
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(withAddresses, null, 2), "utf-8");
    revalidateShell("app-settings-panel"); // purge the Shell's ISR cache → change shows on next load
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
