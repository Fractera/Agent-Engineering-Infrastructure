"use server";

import { hash } from "bcrypt-ts";
import { getDb } from "@/lib/db";
import { nanoid } from "nanoid";

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

  const isFirst = !db.prepare("SELECT id FROM users LIMIT 1").get();
  const roles = isFirst ? ["architect"] : ["user"];

  db.prepare(
    "INSERT INTO users (id, email, nickname, password, roles, provider) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(nanoid(), normalizedEmail, nickname, hashedPassword, JSON.stringify(roles), "credentials");

  return { success: true, roles };
}
