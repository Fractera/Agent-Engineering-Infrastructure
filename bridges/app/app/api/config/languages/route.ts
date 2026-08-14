import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/require-auth";
import { ALL_LANGUAGE_METADATA } from "@/config/translations/language-metadata";
// Единственная дверь к запуску сборки — та же, что у кнопки развёртывания в
// подвале и у автоматического наблюдения за репозиторием. Второй реализации у
// сборки быть не должно: замок, очередь, журнал и откат к рабочей сборке живут
// в ней одной.
import { requestBuild } from "@/app/api/deploy/route";

// The catalog of valid language codes. The UI picks from a checklist of these, so
// a real save is always valid — but we validate server-side too, so a direct API
// call cannot write an unknown code into NEXT_PUBLIC_SUPPORTED_LANGUAGES (which
// would feed generateStaticParams a bogus [lang] and break the build).
const VALID_CODES = new Set(Object.keys(ALL_LANGUAGE_METADATA));

// Key-scoped writer for the Shell's LANGUAGE set. The language SET is build-time env (it feeds
// generateStaticParams for [lang] and bakes into SINGLE_LANG_MODE) — the source of truth is the
// Shell's .env.local, NOT a runtime file. This route reads/writes ONLY the two NEXT_PUBLIC_*
// language keys with a line-preserving upsert, so it never clobbers the rest of .env.local the way
// the general /api/config/env route does (that one re-serialises the whole file from the payload).
// It also mirrors the choice into platform-config.json (languages/defaultLanguage) so the Platform
// panel stays consistent, but env remains authoritative. Changing the set requires a rebuild.

const APP_ENV = process.env.APP_ENV_PATH ?? "/opt/fractera/app/.env.local";
const PLATFORM_CONFIG_PATH =
  process.env.PLATFORM_CONFIG_PATH ??
  "/opt/fractera/app/PLATFORM-CONFIG/platform-config.json";

const SUPPORTED_KEY = "NEXT_PUBLIC_SUPPORTED_LANGUAGES";
const DEFAULT_KEY = "NEXT_PUBLIC_DEFAULT_LOCALE";

// The owner's DELIBERATE choice of languages, marked by a timestamp (owner, 2026-08-13).
//
// The language set can never be empty — a fresh server ships `en` — so "not configured yet" cannot
// be read off the value the way a missing GitHub URL can. Without a mark, a warning about languages
// would either never appear or never leave: the person who genuinely wants one English site would
// be told forever that something is unfinished.
//
// So the mark records an ACT, not a value: pressing Save on the Languages page once. Choosing a
// single English and saving closes it just as fully as choosing twelve — the decision was made, and
// that is the whole point. It is written here, next to the values it certifies, so the two can
// never drift.
const CONFIRMED_KEY = "USER_LANGUAGES_CONFIRMED_AT";

function readEnvValue(content: string, key: string): string | null {
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    if (trimmed.slice(0, eq).trim() === key) return trimmed.slice(eq + 1).trim();
  }
  return null;
}

// Replace the line for `key` if present, otherwise append it. Preserves all other lines/comments.
function upsertEnvLine(content: string, key: string, value: string): string {
  const lines = content.length ? content.split("\n") : [];
  let found = false;
  const next = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const eq = trimmed.indexOf("=");
    if (eq < 0) return line;
    if (trimmed.slice(0, eq).trim() === key) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) next.push(`${key}=${value}`);
  // Drop a trailing empty entry from a final newline, then re-add a single trailing newline.
  while (next.length && next[next.length - 1] === "") next.pop();
  return next.join("\n") + "\n";
}

function parseList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// Languages are BUILD-TIME (NEXT_PUBLIC_SUPPORTED_LANGUAGES feeds generateStaticParams and
// SINGLE_LANG_MODE), so a change only takes effect after the app is REBUILT. Saving therefore runs
// the ordinary deploy pipeline (`npm run build --prefix app` + `pm2 reload fractera-app`) — otherwise
// the switcher reflects a stale set, or the build collapses to single-language and the button hides.
// → step 138.
//
// 🔒 ЗАПУСК ЗДЕСЬ — ЕДИНСТВЕННЫЙ, И ЕГО НОМЕР УЕЗЖАЕТ СТРАНИЦЕ (владелец 2026-08-14).
//
// Здесь стоял слепой `fetch` на собственный `/api/deploy` без ожидания ответа, а
// островок страницы дёргал тот же `/api/deploy` следом. Две сборки на одно
// нажатие: первая занимала очередь, вторая получала 409 «сборка уже идёт», и
// владельцу показывали отказ вместо хода работы. Собирала при этом сама панель —
// на его же нажатие.
//
// Теперь дверь одна и вызывается напрямую (`requestBuild`), а её номер
// возвращается в ответе: страница следит за той самой сборкой, которую вызвало
// её сохранение. Запуск остаётся СЕРВЕРНЫМ — закрытая вкладка не отменяет
// пересборку, ради этого он тут и появился. Гарантия шага 138 не тронута:
// пришедший во время чужой сборки получает `queued`, и `DIRTY_FILE` заставит
// текущую сборку повториться на последнем состоянии.

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const content = fs.existsSync(APP_ENV) ? fs.readFileSync(APP_ENV, "utf-8") : "";
    const languages = parseList(readEnvValue(content, SUPPORTED_KEY));
    const defaultLanguage = (readEnvValue(content, DEFAULT_KEY) ?? "").toLowerCase();
    return NextResponse.json({
      languages: languages.length ? languages : ["en"],
      defaultLanguage: defaultLanguage || (languages[0] ?? "en"),
      // 🔒 ПРИЗНАК ПОДТВЕРЖДЕНИЯ ОТДАЁТСЯ НАРУЖУ (владелец 2026-08-13).
      //
      // Без него страница не могла отличить «владелец согласился на этот набор»
      // от «он его ещё не видел», и получалась ловушка: требование горит,
      // подтверждается оно СОХРАНЕНИЕМ, а сохранение заблокировано, когда менять
      // нечего. Владельцу, которого набор устраивает, нечего было нажать —
      // требование не закрывалось никогда.
      //
      // Отдаётся именно признак, а не сама отметка времени: странице нужен ответ
      // «да/нет», а точное время — внутреннее дело этого файла.
      confirmed: Boolean(readEnvValue(content, CONFIRMED_KEY)),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json()) as { languages?: unknown; defaultLanguage?: unknown };
    const languages = Array.isArray(body.languages)
      ? Array.from(
          new Set(
            body.languages
              .filter((l): l is string => typeof l === "string")
              .map((l) => l.trim().toLowerCase())
              .filter(Boolean)
          )
        )
      : [];
    if (languages.length === 0) {
      return NextResponse.json({ error: "At least one language is required" }, { status: 400 });
    }
    // Reject any code that is not in the catalog (defence against a direct API
    // call — the UI checklist can only submit valid codes).
    const invalid = languages.filter((l) => !VALID_CODES.has(l));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Unknown language code(s): ${invalid.join(", ")}. Use ISO 639-1 codes from the catalog.` },
        { status: 400 }
      );
    }
    let defaultLanguage =
      typeof body.defaultLanguage === "string" ? body.defaultLanguage.trim().toLowerCase() : "";
    if (!defaultLanguage || !languages.includes(defaultLanguage)) defaultLanguage = languages[0];

    // 1) Line-preserving upsert into the Shell's .env.local (authoritative for the build).
    const existing = fs.existsSync(APP_ENV) ? fs.readFileSync(APP_ENV, "utf-8") : "";

    // 🔒 ЧТО БЫЛО ДО ЗАПИСИ — чтобы решить, нужна ли пересборка (владелец на
    // свежем сервере 2026-08-13). Сравниваем ЗДЕСЬ, до перезаписи файла: после
    // неё старого значения уже не существует.
    const prevLangs = parseList(readEnvValue(existing, SUPPORTED_KEY)).join(",");
    const prevDefault = (readEnvValue(existing, DEFAULT_KEY) ?? "").toLowerCase();
    const setChanged = prevLangs !== languages.join(",") || prevDefault !== defaultLanguage;

    let nextEnv = upsertEnvLine(existing, SUPPORTED_KEY, languages.join(","));
    nextEnv = upsertEnvLine(nextEnv, DEFAULT_KEY, defaultLanguage);
    // The act is recorded on EVERY save, not only the first: re-saving is the owner confirming the
    // set again, and a mark that only ever gets written once would age into a claim about a decision
    // taken months ago.
    nextEnv = upsertEnvLine(nextEnv, CONFIRMED_KEY, new Date().toISOString());
    fs.mkdirSync(path.dirname(APP_ENV), { recursive: true });
    fs.writeFileSync(APP_ENV, nextEnv, "utf-8");

    // 2) Mirror into platform-config.json so the Platform panel reflects the choice (env wins).
    try {
      let cfg: Record<string, unknown> = {};
      if (fs.existsSync(PLATFORM_CONFIG_PATH)) {
        cfg = JSON.parse(fs.readFileSync(PLATFORM_CONFIG_PATH, "utf-8")) as Record<string, unknown>;
      }
      cfg.languages = languages;
      cfg.defaultLanguage = defaultLanguage;
      fs.mkdirSync(path.dirname(PLATFORM_CONFIG_PATH), { recursive: true });
      fs.writeFileSync(PLATFORM_CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
    } catch {
      /* best-effort mirror; env is the source of truth */
    }

    // 🔒 ПЕРЕСБОРКА ТОЛЬКО КОГДА НАБОР ДЕЙСТВИТЕЛЬНО ИЗМЕНИЛСЯ (владелец 2026-08-14).
    //
    // Языки запекаются в сборку — значит новая сборка нужна ровно тогда, когда в
    // ней окажется другое. Подтверждение прежнего набора («оставить эти языки»)
    // меняет только отметку в окружении, которая читается на каждый запрос:
    // собирать байт в байт то же самое — это несколько минут ожидания за
    // ничто. Страница это уже знала и не запускала сборку; теперь то же знает и
    // сервер, поэтому правило держится независимо от того, кто пришёл — браузер,
    // другая страница или прямой запрос к API.
    if (!setChanged) {
      return NextResponse.json({ ok: true, languages, defaultLanguage, rebuildRequired: false });
    }

    const build = requestBuild(`languages: ${languages.join(",")} (default ${defaultLanguage})`);
    return NextResponse.json({
      ok: true, languages, defaultLanguage,
      rebuildRequired: true, rebuildScheduled: true,
      jobId: build.jobId, queued: build.queued, requestedAt: build.requestedAt,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
