import { shouldBypassAuth } from "@/lib/auth-bypass";

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? "http://localhost:3001";

/**
 * Кто вошёл — адрес и роли (владелец 2026-08-14).
 *
 * Понадобилось запросу консультации: обратный адрес обязан быть НАСТОЯЩИМ, а
 * спрашивать его полем значит просить человека набрать то, что система про него
 * уже знает. Отдельная функция, а не поле у `requireAuth`, потому что «пускать
 * ли» и «кто это» — разные вопросы, и первый задаётся на каждый запрос панели.
 */
export async function sessionUser(cookie: string): Promise<{ email?: string; roles?: string[] } | null> {
  if (!cookie) return null;
  try {
    const res = await fetch(`${AUTH_SERVICE}/api/session`, {
      headers: { cookie },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const d = (await res.json()) as { email?: string; roles?: string[] };
    return { email: d.email, roles: d.roles };
  } catch {
    return null;
  }
}

export async function requireAuth(cookie: string): Promise<boolean> {
  if (shouldBypassAuth()) return true;
  if (!cookie) return false;
  try {
    const res = await fetch(`${AUTH_SERVICE}/api/session`, {
      headers: { cookie },
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
