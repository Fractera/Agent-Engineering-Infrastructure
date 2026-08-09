// Серверное чтение истории развёртываний (шаг 501, Ф2, партия 13).
//
// Записи живут в слое данных, поэтому переживают перезапуск панели — этим история
// и отличается от журнала в памяти процесса.
//
// ЖУРНАЛ ОДНОГО ПРОГОНА тоже читает сервер, если номер прогона стоит в адресе.
// Так журнал становится ссылкой, которую можно переслать, и читается без JS. Список
// при этом остаётся без журналов: сотня сборок компиляторного вывода — это
// мегабайты, которых никто не просил.

import { headers } from "next/headers";

const ADMIN = process.env.ADMIN_INTERNAL_URL ?? "http://127.0.0.1:3002";

export type Run = {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  description: string;
  duration_ms: number | null;
  commit_hash: string | null;
  log_size?: number;
  log?: string;
};

export type AutoMode = "off" | "pull" | "pull+deploy";
export type AutoState = {
  mode: AutoMode;
  lastCheckAt?: string | null;
  lastResult?: string | null;
  lastReason?: string | null;
};

async function ask(path: string): Promise<unknown | null> {
  const cookie = (await headers()).get("cookie") ?? "";
  try {
    const r = await fetch(`${ADMIN}${path}`, {
      headers: { cookie },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function readRuns(limit = 100): Promise<{ ok: boolean; runs: Run[] }> {
  const d = (await ask(`/api/deploy/history?limit=${limit}`)) as { runs?: Run[] } | null;
  if (!d) return { ok: false, runs: [] };
  return { ok: true, runs: d.runs ?? [] };
}

export async function readRun(id: string): Promise<Run | null> {
  const d = (await ask(`/api/deploy/history?id=${encodeURIComponent(id)}`)) as { run?: Run } | null;
  return d?.run ?? null;
}

export async function readAuto(): Promise<AutoState> {
  const d = (await ask("/api/config/auto-deploy")) as AutoState | null;
  return d ?? { mode: "off" };
}

// SQLite хранит время в UTC без пометки зоны. Без явного «Z» браузер прочитал бы
// его как местное и показал сборку, законченную «через три часа».
export function whenLabel(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : `${iso.replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export function howLong(ms: number | null): string {
  if (!ms || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}
