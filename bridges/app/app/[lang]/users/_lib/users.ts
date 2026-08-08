// Серверное чтение списка учётных записей (шаг 501, Ф2).
//
// Строки принадлежат службе авторизации `:3001`, а не панели. Старая панель
// ходила к ним так: браузер → `/api/admin/users` (прокси панели) → служба
// авторизации. Здесь первый шаг лишний: страница уже на сервере, поэтому она
// обращается к службе НАПРЯМУЮ, пробрасывая cookie посетителя. На один сетевой
// прыжок меньше и никакого состояния «загружается».
//
// Прокси-маршруты `/api/admin/users*` НЕ удаляем: они нужны и замороженной
// старой панели, и островку изменений на этой странице (браузер обращается к
// панели, а не к службе, — это правило не меняем).

import { headers } from "next/headers";

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? "http://localhost:3001";

export const USERS_PER_PAGE = 100;

export type AdminUser = {
  id: string;
  email: string;
  nickname: string | null;
  roles: string;
  is_active: number;
  provider: string;
  created_at: string;
};

export type UsersPage =
  | { ok: true; users: AdminUser[]; total: number; page: number; pages: number }
  | { ok: false; reason: string };

// `roles` приезжает строкой JSON. Разбор в одном месте: страница и островок
// обязаны понимать роли одинаково, иначе одна и та же запись покажет разные
// роли в таблице и в диалоге.
export function parseRoles(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : ["user"];
  } catch {
    return ["user"];
  }
}

export async function fetchUsersPage(q: string, page: number): Promise<UsersPage> {
  const params = new URLSearchParams({ page: String(page) });
  if (q) params.set("q", q);

  // Список учётных записей — данные ПОСЕТИТЕЛЯ: служба авторизации отвечает по
  // его сессии. Поэтому cookie обязателен, и поэтому страница динамическая.
  const cookie = (await headers()).get("cookie") ?? "";

  try {
    const res = await fetch(`${AUTH_SERVICE}/api/admin/users?${params}`, {
      headers: { cookie },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, reason: String(data?.error ?? res.status) };

    const total = Number(data.total ?? 0);
    return {
      ok: true,
      users: (data.users ?? []) as AdminUser[],
      total,
      page,
      pages: Math.max(1, Math.ceil(total / USERS_PER_PAGE)),
    };
  } catch {
    // Служба недоступна — говорим об этом, а не показываем пустую таблицу:
    // «нет пользователей» и «не удалось спросить» это разные вещи.
    return { ok: false, reason: "auth-service-unavailable" };
  }
}
