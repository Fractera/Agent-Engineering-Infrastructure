import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getDb } from "@/lib/db/index";

export const PATCH = auth(async function PATCH(req, context) {
  const session = req.auth;
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles: string[] = (session.user as { roles?: string[] }).roles ?? [];
  if (!roles.includes("architect")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const params = await (context?.params as Promise<{ id: string }>);
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const currentUserId = (session.user as { id?: string }).id;
  if (id === currentUserId) return NextResponse.json({ error: "Cannot modify your own account" }, { status: 400 });

  const body = await req.json() as {
    nickname?: string;
    email?: string;
    roles?: string[];
    is_active?: number;
  };

  const db = getDb();
  const user = db.prepare("SELECT id, email FROM users WHERE id = ?").get(id) as { id: string; email: string } | undefined;
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.nickname !== undefined) { updates.push("nickname = ?"); values.push(body.nickname); }
  if (body.email !== undefined && body.email !== user.email) {
    const existing = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(body.email, id);
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    updates.push("email = ?"); values.push(body.email);
  }
  if (body.roles !== undefined) { updates.push("roles = ?"); values.push(JSON.stringify(body.roles)); }
  if (body.is_active !== undefined) { updates.push("is_active = ?"); values.push(body.is_active ? 1 : 0); }

  if (updates.length === 0) return NextResponse.json({ ok: true });

  updates.push("updated_at = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  return NextResponse.json({ ok: true });
});

export const DELETE = auth(async function DELETE(req, context) {
  const session = req.auth;
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles: string[] = (session.user as { roles?: string[] }).roles ?? [];
  if (!roles.includes("architect")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const params = await (context?.params as Promise<{ id: string }>);
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const currentUserId = (session.user as { id?: string }).id;
  if (id === currentUserId) return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });

  const db = getDb();
  const result = db.prepare("DELETE FROM users WHERE id = ?").run(id);
  if (result.changes === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
});
