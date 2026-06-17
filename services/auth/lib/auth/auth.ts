import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { SqliteAdapter } from "./sqlite-adapter";
import { getDb } from "@/lib/db";

const nextAuth = NextAuth({
  ...authConfig,
  // Adapter persists OAuth users/accounts + magic-link verification tokens in
  // the auth service's SQLite DB. Session stays JWT — Credentials sign-ins
  // (password / admin-token / guest) continue to work exactly as before.
  adapter: SqliteAdapter(getDb()),
  session: { strategy: "jwt" },
});

export const { handlers, auth, signIn, signOut } = nextAuth;
export const { GET, POST } = nextAuth.handlers;
