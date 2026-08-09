// Серверное чтение состояния связи с GitHub (шаг 501, Ф2, партия 14).
//
// Три состояния, и они разные по смыслу — панель их уже различала, и это стоит
// сохранить дословно:
//   • `unconfigured` — данных нет вовсе;
//   • `unverified`   — данные введены, но GitHub их ещё не подтвердил;
//   • `working`      — GitHub ответил, связь настоящая.
// Второе состояние — не придирка: заполненное поле легко принять за работающую
// связь, и тогда «почему репозиторий пустой» становится загадкой.

import { headers } from "next/headers";

const ADMIN = process.env.ADMIN_INTERNAL_URL ?? "http://127.0.0.1:3002";

export type GitState = "unconfigured" | "unverified" | "working";

export type GitStatus = {
  state: GitState;
  repoUrl: string;
  hasToken: boolean;
  verifiedAt: string | null;
  // Сколько файлов на сервере ещё не уехало в репозиторий, и несколько имён для
  // примера: число без примеров не даёт понять, о чём речь.
  pendingFiles: number;
  sample: string[];
};

export type GitResult = { ok: true; status: GitStatus } | { ok: false; reason: string };

export async function readGitStatus(): Promise<GitResult> {
  const cookie = (await headers()).get("cookie") ?? "";
  try {
    const r = await fetch(`${ADMIN}/api/config/git-connect`, {
      headers: { cookie },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, reason: String(d?.error ?? r.status) };
    return {
      ok: true,
      status: {
        state: (d.state as GitState) ?? "unconfigured",
        repoUrl: String(d.repoUrl ?? ""),
        hasToken: Boolean(d.hasToken),
        verifiedAt: (d.verifiedAt as string) ?? null,
        pendingFiles: Number(d.pendingFiles ?? 0),
        sample: Array.isArray(d.sample) ? (d.sample as string[]) : [],
      },
    };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}
