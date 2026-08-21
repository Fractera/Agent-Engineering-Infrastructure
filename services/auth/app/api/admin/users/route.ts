import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getDb } from "@/lib/db/index";

export const GET = auth(function GET(req) {
  const session = req.auth;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const roles: string[] = (session.user as { roles?: string[] }).roles ?? [];
  // 🔒 СПИСОК ВИДЯТ АДМИНИСТРАТОР И АРХИТЕКТОР (решение владельца 2026-08-21).
  //
  // Здесь стоял один `architect`, и это делало страницу управления ролями
  // недоступной той роли, ради которой она существует: администратор — тот, кто
  // раздаёт права в повседневной работе, архитектор занят другим.
  //
  // Смежная правка в соседнем маршруте `[id]` шире по последствиям: там решается,
  // кому позволено ТРОГАТЬ роль архитектора.
  if (!roles.some((r) => r === "architect" || r === "admin")) {
    return NextResponse.json({ error: "Forbidden", requires: ["admin", "architect"] }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  // 🔒 РАЗМЕР СТРАНИЦЫ ЗАДАЁТ ВЫЗЫВАЮЩИЙ (2026-08-21). Здесь стояло жёсткое
  // `perPage = 100`, и интерфейс не мог предложить человеку выбор: список из
  // десяти строк на экране требует одного шага, разбор тысячи учётных записей —
  // другого.
  //
  // Значение берётся из адреса, но не как есть: чужой запрос не имеет права
  // попросить всю таблицу разом. Разрешён закрытый набор — те же ступени, что у
  // соседних списков продукта, — а всё остальное молча становится ближайшим
  // законным. Отказ здесь был бы хуже: интерфейс не должен ломаться из-за
  // опечатки в адресе.
  const ALLOWED_PER_PAGE = [10, 20, 50, 100];
  const asked = parseInt(url.searchParams.get("perPage") ?? "", 10);
  const perPage = ALLOWED_PER_PAGE.includes(asked) ? asked : 100;
  const offset = (page - 1) * perPage;

  const db = getDb();

  if (q) {
    const like = `%${q}%`;
    const total = (db.prepare(
      "SELECT COUNT(*) as cnt FROM users WHERE email LIKE ? OR nickname LIKE ?"
    ).get(like, like) as { cnt: number }).cnt;

    const users = db.prepare(
      "SELECT id, email, nickname, roles, is_active, provider, created_at FROM users WHERE email LIKE ? OR nickname LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).all(like, like, perPage, offset);

    return NextResponse.json({ users, total, page, perPage });
  }

  const total = (db.prepare("SELECT COUNT(*) as cnt FROM users").get() as { cnt: number }).cnt;
  const users = db.prepare(
    "SELECT id, email, nickname, roles, is_active, provider, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?"
  ).all(perPage, offset);

  return NextResponse.json({ users, total, page, perPage });
});
