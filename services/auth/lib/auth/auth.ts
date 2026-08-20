import NextAuth from "next-auth";
import { decode as defaultDecode } from "next-auth/jwt";
import { authConfig } from "./auth.config";
import { SqliteAdapter } from "./sqlite-adapter";
import { getDb } from "@/lib/db";

// 🔒 КУКА ОТ ПРОШЛОГО СЕРВЕРА НЕ ИМЕЕТ ПРАВА ЗАПИРАТЬ ВЛАДЕЛЬЦА (2026-08-20).
//
// ЧТО СЛУЧИЛОСЬ. Сервер развернули заново, и он выпустил новый `AUTH_SECRET`.
// В браузере владельца осталась сессионная кука, выпущенная ПРЕЖНЕЙ установкой
// на том же домене. Расшифровать её новым ключом невозможно, и разбор бросал
// `JWTSessionError` с причиной `no matching decryption secret` — НА КАЖДЫЙ
// запрос. Браузер куку не выбрасывал и слал снова: вход ходил по кругу, а в
// журнале накопилось 3481 запись об одной и той же мёртвой куке. Замер:
// восемнадцать честных запросов дают НОЛЬ строк, одна протухшая кука — 13.
//
// Бьёт это ровно во владельца: только у него есть кука от прошлой установки
// своего же сервера. Посетитель, пришедший впервые, ничего не замечает.
//
// ЛЕЧЕНИЕ. Нерасшифровываемый токен — это «сессии нет», а не «сломалось».
// Возвращаем `null` вместо исключения: NextAuth считает гостя неавторизованным,
// показывает вход, а первый же успешный вход перезаписывает куку свежей.
//
// 🔒 ЭТО НЕ ОСЛАБЛЕНИЕ ЗАЩИТЫ, И ЭТО ВАЖНО ПОНИМАТЬ ТОЧНО. Мы не принимаем
// негодный токен — мы отказываем ТИШЕ. Ни одна подпись не становится валидной:
// путь «расшифровалось» остаётся нетронутым, меняется только поведение на
// провале — вместо исключения пустая сессия.
async function decodeOrNoSession(params: Parameters<typeof defaultDecode>[0]) {
  try {
    return await defaultDecode(params);
  } catch {
    return null;
  }
}

const nextAuth = NextAuth({
  ...authConfig,
  // Adapter persists OAuth users/accounts + magic-link verification tokens in
  // the auth service's SQLite DB. Session stays JWT — Credentials sign-ins
  // (password / admin-token / guest) continue to work exactly as before.
  adapter: SqliteAdapter(getDb()),
  session: { strategy: "jwt" },
  jwt: { decode: decodeOrNoSession },
});

export const { handlers, auth, signIn, signOut } = nextAuth;
export const { GET, POST } = nextAuth.handlers;
