import type { Adapter, AdapterUser } from "next-auth/adapters";
import type Database from "better-sqlite3";
import { nanoid } from "nanoid";

// NextAuth adapter backed by the auth service's own better-sqlite3 database.
// FES uses @auth/prisma-adapter over Postgres; production auth has no adapter —
// it ran on JWT-only Credentials. Google OAuth + Resend magic-link both need an
// adapter to persist users / accounts / verification tokens, so we provide one
// over the four tables migrations.ts already creates (users / sessions /
// accounts / verification_tokens). Session strategy stays "jwt" — the session
// methods are never called, so they are intentionally omitted.

type UserRow = {
  id: string;
  email: string;
  nickname: string | null;
  avatar_url: string | null;
  email_verified: string | null;
  roles: string;
  provider: string;
};

const USER_COLS = "id, email, nickname, avatar_url, email_verified, roles, provider";

function safeRoles(raw: string): string[] {
  try {
    const r = JSON.parse(raw);
    return Array.isArray(r) ? (r as string[]) : ["user"];
  } catch {
    return ["user"];
  }
}

function toIso(d: Date | null | undefined): string | null {
  return d ? new Date(d).toISOString() : null;
}

// Map our row to NextAuth's AdapterUser. `roles` is surfaced as an extra field
// so the jwt callback (auth.config.ts) can stamp it onto the token, exactly as
// the Credentials providers already do.
function rowToUser(row: UserRow): AdapterUser & { roles: string[] } {
  return {
    id: row.id,
    email: row.email,
    emailVerified: row.email_verified ? new Date(row.email_verified) : null,
    name: row.nickname,
    image: row.avatar_url,
    roles: safeRoles(row.roles),
  };
}

export function SqliteAdapter(db: Database.Database): Adapter {
  return {
    async createUser(user) {
      const id = user.id || nanoid();
      // First user on the server becomes the owner-admin — mirrors
      // lib/auth/register.ts. Every later sign-up, via ANY provider, is a
      // normal user.
      const isFirst = !db.prepare("SELECT id FROM users LIMIT 1").get();
      const roles = isFirst ? ["admin"] : ["user"];
      // Default provider "email": the magic-link path never calls linkAccount,
      // so it keeps this value; OAuth flows overwrite it in linkAccount with the
      // real provider id (e.g. "google").
      db.prepare(
        `INSERT INTO users (id, email, nickname, avatar_url, roles, provider, email_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        user.email,
        user.name ?? null,
        user.image ?? null,
        JSON.stringify(roles),
        "email",
        toIso(user.emailVerified)
      );
      const row = db.prepare(`SELECT ${USER_COLS} FROM users WHERE id = ?`).get(id) as UserRow;
      return rowToUser(row);
    },

    async getUser(id) {
      const row = db.prepare(`SELECT ${USER_COLS} FROM users WHERE id = ?`).get(id) as UserRow | undefined;
      return row ? rowToUser(row) : null;
    },

    async getUserByEmail(email) {
      const row = db
        .prepare(`SELECT ${USER_COLS} FROM users WHERE email = ?`)
        .get(email.trim().toLowerCase()) as UserRow | undefined;
      return row ? rowToUser(row) : null;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const row = db
        .prepare(
          `SELECT ${USER_COLS.split(", ").map((c) => `u.${c}`).join(", ")}
           FROM accounts a JOIN users u ON u.id = a.user_id
           WHERE a.provider = ? AND a.provider_account_id = ?`
        )
        .get(provider, providerAccountId) as UserRow | undefined;
      return row ? rowToUser(row) : null;
    },

    async updateUser(user) {
      const existing = db.prepare(`SELECT ${USER_COLS} FROM users WHERE id = ?`).get(user.id) as UserRow | undefined;
      if (!existing) throw new Error("updateUser: user not found");
      const email = user.email ?? existing.email;
      const nickname = user.name !== undefined ? user.name : existing.nickname;
      const avatar = user.image !== undefined ? user.image : existing.avatar_url;
      const verified = user.emailVerified !== undefined ? toIso(user.emailVerified) : existing.email_verified;
      db.prepare(
        `UPDATE users SET email = ?, nickname = ?, avatar_url = ?, email_verified = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(email, nickname, avatar, verified, user.id);
      const row = db.prepare(`SELECT ${USER_COLS} FROM users WHERE id = ?`).get(user.id) as UserRow;
      return rowToUser(row);
    },

    async deleteUser(userId) {
      db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    },

    async linkAccount(account) {
      db.prepare(
        `INSERT INTO accounts
           (id, user_id, type, provider, provider_account_id, access_token, refresh_token,
            expires_at, token_type, scope, id_token, session_state)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        nanoid(),
        account.userId,
        account.type,
        account.provider,
        account.providerAccountId,
        account.access_token ?? null,
        account.refresh_token ?? null,
        account.expires_at ?? null,
        account.token_type ?? null,
        account.scope ?? null,
        account.id_token ?? null,
        account.session_state != null ? String(account.session_state) : null
      );
      // Reflect the real sign-in provider on the user (createUser defaulted to "email").
      db.prepare("UPDATE users SET provider = ? WHERE id = ?").run(account.provider, account.userId);
      return account;
    },

    async unlinkAccount({ provider, providerAccountId }) {
      db.prepare("DELETE FROM accounts WHERE provider = ? AND provider_account_id = ?").run(provider, providerAccountId);
    },

    async createVerificationToken(token) {
      db.prepare("INSERT INTO verification_tokens (identifier, token, expires) VALUES (?, ?, ?)").run(
        token.identifier,
        token.token,
        toIso(token.expires)
      );
      return token;
    },

    async useVerificationToken({ identifier, token }) {
      const row = db
        .prepare("SELECT identifier, token, expires FROM verification_tokens WHERE identifier = ? AND token = ?")
        .get(identifier, token) as { identifier: string; token: string; expires: string } | undefined;
      if (!row) return null;
      db.prepare("DELETE FROM verification_tokens WHERE identifier = ? AND token = ?").run(identifier, token);
      return { identifier: row.identifier, token: row.token, expires: new Date(row.expires) };
    },
  };
}
