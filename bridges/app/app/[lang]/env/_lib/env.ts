// Серверное чтение переменных окружения (шаг 501, Ф2, партия 15).
//
// 🔒 ЗНАЧЕНИЯ СЕКРЕТОВ НЕ ПОКИДАЮТ СЕРВЕР. Старая панель получала весь файл
// окружения в браузер и рисовала значения открытым текстом — то есть ключ GitHub,
// AUTH_SECRET и прочее лежали в разметке страницы. Здесь секретные значения
// заменяются маской НА СЕРВЕРЕ, и в браузер уезжает только она. Ввести новое
// значение можно, увидеть старое — нет, и это правильный обмен: смотреть на
// секрет незачем, менять его нужно.
//
// Что считается секретом: имя, содержащее KEY, SECRET, TOKEN или PASSWORD. Список
// намеренно по ИМЕНИ, а не перечислением: новая переменная с ключом в имени
// закроется сама, без правки кода.

import { headers } from "next/headers";

const ADMIN = process.env.ADMIN_INTERNAL_URL ?? "http://127.0.0.1:3002";

// Запертые ключи — те же, что запрещает менять маршрут. Дублировать список нельзя:
// расхождение означало бы, что страница обещает правку, которую сервер отвергнет.
// Поэтому читаем его из самого маршрута.
import { LOCKED_ENV_KEYS } from "@/lib/env-locked";

export type EnvEntry = {
  key: string;
  /** Значение или маска. Для секретов — всегда маска. */
  shown: string;
  secret: boolean;
  locked: boolean;
  empty: boolean;
};

const SECRET_RE = /(KEY|SECRET|TOKEN|PASSWORD)/i;

function mask(v: string): string {
  if (!v) return "";
  return v.length <= 8 ? "•".repeat(v.length) : `${v.slice(0, 4)}…${v.slice(-4)}`;
}

export type EnvResult = { ok: true; entries: EnvEntry[] } | { ok: false; reason: string };

export async function readEnv(): Promise<EnvResult> {
  const cookie = (await headers()).get("cookie") ?? "";
  try {
    const r = await fetch(`${ADMIN}/api/config/env`, {
      headers: { cookie },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, reason: String(d?.error ?? r.status) };

    const vars = (d.vars ?? {}) as Record<string, string>;
    // Полезные для проекта ключи, которых может ещё не быть: показываем пустыми,
    // чтобы владелец знал, что их вообще можно задать.
    for (const k of ["USER_GITHUB_REPO_URL", "USER_GITHUB_ACCESS_TOKEN"]) {
      if (!(k in vars)) vars[k] = "";
    }

    const entries = Object.entries(vars)
      .map(([key, value]) => {
        const secret = SECRET_RE.test(key);
        return {
          key,
          shown: secret ? mask(value) : value,
          secret,
          locked: LOCKED_ENV_KEYS.has(key),
          empty: value === "",
        };
      })
      // Порядок: сначала пустые (их надо заполнить), потом обычные, запертые в
      // конец — их всё равно нельзя менять.
      .sort((a, b) => {
        if (a.locked !== b.locked) return a.locked ? 1 : -1;
        if (a.empty !== b.empty) return a.empty ? -1 : 1;
        return a.key.localeCompare(b.key);
      });

    return { ok: true, entries };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

// ── ЗНАЧЕНИЯ, КОТОРЫЕ ЖИВУТ НЕ В ФАЙЛЕ ОКРУЖЕНИЯ (шаг 47, 2026-08-30) ─────────
//
// 🔒 ЗАЧЕМ ОНИ ЗДЕСЬ. Владелец сверял токен бота и ключ OpenAI, уходя в другие
// разделы панели и копируя значения оттуда. Причина не в интерфейсе, а в том, где
// они лежат: токен и `chatId` — в конфиге службы каналов, ключ OpenAI — в `.env`
// службы RAG. Файл окружения слота их не содержит и содержать не будет.
//
// 🔒 ЗДЕСЬ ТОЛЬКО МАСКА. Само значение приезжает отдельным запросом по нажатию
// глазика (`api/config/env-reveal`) и в разметку страницы не попадает никогда.

export type ServiceSecret = {
  /** Имя для двери показа — из её закрытого списка. */
  name: "telegramToken" | "telegramBot" | "telegramChatId" | "openaiKey";
  /** Маска либо пустая строка, если значения нет. */
  shown: string;
  empty: boolean;
  /** Имя бота и `chatId` секретами не являются: их показываем сразу. */
  secret: boolean;
};

export async function readServiceSecrets(): Promise<ServiceSecret[]> {
  const cookie = (await headers()).get("cookie") ?? "";
  const names: ServiceSecret["name"][] = [
    "telegramBot",
    "telegramChatId",
    "telegramToken",
    "openaiKey",
  ];
  const secretNames = new Set(["telegramToken", "openaiKey"]);

  const out: ServiceSecret[] = [];
  for (const name of names) {
    let value = "";
    try {
      const r = await fetch(`${ADMIN}/api/config/env-reveal`, {
        method: "POST",
        headers: { cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      const d = await r.json().catch(() => ({}));
      value = r.ok ? String(d?.value ?? "") : "";
    } catch {
      value = "";
    }
    const secret = secretNames.has(name);
    out.push({
      name,
      // 🔒 Секрет уходит в браузер ТОЛЬКО маской; несекретное — как есть, потому
      // что прятать имя бота под точками значит заставлять нажимать глазик ради
      // того, что и так написано на кнопке в Telegram.
      shown: value ? (secret ? mask(value) : value) : "",
      empty: value === "",
      secret,
    });
  }
  return out;
}
