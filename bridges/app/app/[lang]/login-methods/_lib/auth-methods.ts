// Серверное чтение способов входа (шаг 501, Ф2, партия 10).
//
// Читаем то же, что читала панель, но до отдачи страницы: настроен ли вход через
// Google, настроена ли ссылка-вход по почте, и в защищённом ли режиме сервер.
// Секреты сюда НЕ попадают — маршрут отдаёт их уже замаскированными, и это
// правило не меняем: замаскировать на клиенте значило бы сначала отправить их в
// браузер.

import { headers } from "next/headers";

const ADMIN = process.env.ADMIN_INTERNAL_URL ?? "http://127.0.0.1:3002";

export type AuthMethods = {
  secure: boolean;
  google: { configured: boolean; clientIdMasked: string | null };
  resend: { configured: boolean; keyMasked: string | null; from: string };
  googleCallbackUrl: string | null;
};

export type MethodsResult = { ok: true; methods: AuthMethods } | { ok: false; reason: string };

export async function readAuthMethods(): Promise<MethodsResult> {
  const cookie = (await headers()).get("cookie") ?? "";
  try {
    const r = await fetch(`${ADMIN}/api/config/auth-methods`, {
      headers: { cookie },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return { ok: false, reason: `${r.status}` };
    return { ok: true, methods: (await r.json()) as AuthMethods };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}
