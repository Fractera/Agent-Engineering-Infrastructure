import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getDb } from "@/lib/db/index";

export const GET = auth(function GET(req) {
  const session = req.auth;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const roles: string[] = (session.user as { roles?: string[] }).roles ?? [];
  if (!roles.includes("architect")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const perPage = 100;
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
