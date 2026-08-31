import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { flowValue, setFlowVerified, flowVerifiedAt, isLaunchPath, PATH_INPUTS } from "@/lib/launch-flow";
import type { LaunchPath } from "@/lib/launch-flow";

// ПРОВЕРКА СВЯЗИ С GITHUB — ШАГ 3 НОВОГО ПУТИ (28-19, 2026-08-27).
//
// 🔒 ЭТО НАСТОЯЩИЙ ВОПРОС К GITHUB, А НЕ ОСМОТР СВОИХ ПОЛЕЙ. Владелец дал слово
// доделать шаг, и весь его смысл в различии, записанном ещё в шаге 25: «зелёное
// состояние означает, что пришёл настоящий ответ, а не то, что поля заполнены».
// Дверь, отвечающая «всё хорошо» на основании непустых строк, была бы той самой
// имитацией, ради устранения которой шаг и существует.
//
// 🔒 СПРАШИВАЕМ ПРАВО ПИСАТЬ, А НЕ ПРАВО ЧИТАТЬ. Публичный репозиторий читается
// вообще без токена, поэтому успешное чтение НИЧЕГО не доказывает о токене.
// Ответ GitHub несёт `permissions.push` — вот его и проверяем: именно запись
// нужна на шаге отправки, и провалиться она должна здесь, а не через три шага.
//
// 🔒 ПРИЧИНА ОТКАЗА НАЗЫВАЕТСЯ МАШИННЫМ СЛОВОМ, А НЕ ЧЕЛОВЕЧЕСКОЙ ФРАЗОЙ. Текст
// живёт в словаре пути и переводится; дверь отдаёт `bad-token`, `no-repo`,
// `no-push`, и страница превращает это в то, что надо сделать.
//
// 🔒 ТОКЕН НЕ ПОКИДАЕТ СЕРВЕР. Он читается из состояния здесь же и уезжает
// только в GitHub, в заголовке. Ни в ответе двери, ни в журнале его нет.

export const dynamic = "force-dynamic";

/** Из адреса репозитория — пара «владелец/название» для API GitHub. */
function repoPath(url: string): string | null {
  const m = url.match(/^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 🔒 ПУТЬ ПРИХОДИТ ТЕЛОМ, А УМОЛЧАНИЕ — ПЕРВЫЙ (35-6). Механика вопроса к
  // GitHub одна на оба пути; отличается только пара значений, о которой
  // спрашивают. Второй экземпляр этой двери разошёлся бы с первым молча.
  const body = (await req.json().catch(() => null)) as { path?: unknown } | null;
  const launchPath: LaunchPath = isLaunchPath(body?.path) ? body.path : "starter";
  const inputs = PATH_INPUTS[launchPath];

  const url = flowValue(inputs.url);
  const token = flowValue(inputs.token);

  // Проверять нечего — и это не отказ GitHub, а незакрытый предыдущий шаг.
  if (!url) return NextResponse.json({ ok: false, reason: "no-url" }, { status: 422 });
  if (!token) return NextResponse.json({ ok: false, reason: "no-token" }, { status: 422 });

  const path = repoPath(url);
  if (!path) return NextResponse.json({ ok: false, reason: "bad-url" }, { status: 422 });

  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "fractera-admin",
      },
      cache: "no-store",
    });
  } catch {
    // 🔒 СЕТЬ НЕ ОТВЕТИЛА — ЭТО НЕ «ТОКЕН ПЛОХОЙ». Свалить всё в одну причину
    // значит отправить человека выпускать новый токен вместо того, чтобы
    // подождать. Отметка при этом не ставится и не снимается.
    return NextResponse.json({ ok: false, reason: "network" }, { status: 502 });
  }

  if (res.status === 401) {
    setFlowVerified(false, launchPath);
    return NextResponse.json({ ok: false, reason: "bad-token" }, { status: 422 });
  }
  if (res.status === 404) {
    // 404 у GitHub означает и «нет такого», и «нет доступа»: приватный
    // репозиторий чужому токену не показывают вовсе. Поэтому причина одна и
    // названа честно — «репозиторий не найден ЭТИМ токеном».
    setFlowVerified(false, launchPath);
    return NextResponse.json({ ok: false, reason: "no-repo" }, { status: 422 });
  }
  if (!res.ok) {
    setFlowVerified(false, launchPath);
    return NextResponse.json({ ok: false, reason: "github-error", status: res.status }, { status: 502 });
  }

  const data = (await res.json().catch(() => null)) as
    | { permissions?: { push?: boolean }; full_name?: string; private?: boolean }
    | null;

  if (!data?.permissions?.push) {
    setFlowVerified(false, launchPath);
    return NextResponse.json({ ok: false, reason: "no-push" }, { status: 422 });
  }

  setFlowVerified(true, launchPath);

  return NextResponse.json({
    ok: true,
    repo: data.full_name ?? path,
    private: data.private ?? null,
    verifiedAt: flowVerifiedAt(launchPath),
  });
}
