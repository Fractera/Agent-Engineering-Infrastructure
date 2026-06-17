"use server";

import { hash } from "bcrypt-ts";
import { getDb } from "@/lib/db";
import { nanoid } from "nanoid";
import { auth } from "./auth";

type RegisterResult =
  | { success: true; roles: string[] }
  | { success: false; error: string };

export async function register(email: string, password: string): Promise<RegisterResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const db = getDb();

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(normalizedEmail);

  if (existing) {
    return { success: false, error: "This email is already registered" };
  }

  const hashedPassword = await hash(password, 10);
  const nickname = normalizedEmail.split("@")[0];

  // Guest promotion (HOW-USE-AUTH.md / auth-architecture §13): if the caller is
  // currently signed in as a GUEST, promote that SAME row in place — set the real
  // email/password, switch roles to ["user"], keep provider="credentials" — instead
  // of inserting a new user. Because user.id is unchanged, every record the guest
  // produced (cart, chat, drafts) stays attached. No data migration.
  // Default (non-guest) registration is byte-identical to before.
  const session = await auth().catch(() => null);
  const sessRoles = (session?.user as { roles?: string[] } | undefined)?.roles ?? [];
  const sessUserId = (session?.user as { id?: string } | undefined)?.id;
  if (sessUserId && sessRoles.includes("guest")) {
    const guest = db
      .prepare("SELECT id, provider FROM users WHERE id = ?")
      .get(sessUserId) as { id: string; provider: string } | undefined;
    if (guest && guest.provider === "guest") {
      db.prepare(
        "UPDATE users SET email = ?, nickname = ?, password = ?, roles = ?, provider = 'credentials', updated_at = datetime('now') WHERE id = ?"
      ).run(normalizedEmail, nickname, hashedPassword, JSON.stringify(["user"]), guest.id);
      return { success: true, roles: ["user"] };
    }
  }

  const isFirst = !db.prepare("SELECT id FROM users LIMIT 1").get();
  const roles = isFirst ? ["architect"] : ["user"];

  db.prepare(
    "INSERT INTO users (id, email, nickname, password, roles, provider) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(nanoid(), normalizedEmail, nickname, hashedPassword, JSON.stringify(roles), "credentials");

  return { success: true, roles };
}
