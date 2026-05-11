import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcrypt-ts";
import { getDb } from "@/lib/db";

function buildProviders(): NextAuthConfig["providers"] {
  const providers: NextAuthConfig["providers"] = [];

  if (process.env.ARCHITECT_TOKEN) {
    providers.push(
      Credentials({
        id: "admin",
        credentials: {
          token: { label: "Admin Token", type: "password" },
        },
        async authorize(credentials) {
          const token = credentials?.token as string | undefined;
          if (!token || token !== process.env.ARCHITECT_TOKEN) return null;
          return {
            id: "virtual-admin",
            email: "admin@local",
            name: "Administrator",
            roles: ["admin"] as string[],
          };
        },
      })
    );
  }

  providers.push(
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const rawEmail = credentials?.email as string | undefined;
        const email = rawEmail?.trim().toLowerCase();
        const password = credentials?.password as string | undefined;

        if (!email) return null;

        const db = getDb();
        const user = db
          .prepare("SELECT id, email, nickname, password, roles FROM users WHERE email = ?")
          .get(email) as {
          id: string;
          email: string;
          nickname: string | null;
          password: string | null;
          roles: string;
        } | undefined;

        if (!user) return null;

        const roles = JSON.parse(user.roles) as string[];

        if (!user.password) {
          return { id: user.id, email: user.email, name: user.nickname, roles };
        }

        if (!password) return null;

        const valid = await compare(password, user.password);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.nickname, roles };
      },
    })
  );

  return providers;
}

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  providers: buildProviders(),
  cookies: {
    sessionToken: {
      name: process.env.COOKIE_SECURE === "true"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: process.env.COOKIE_SECURE === "true",
        domain: process.env.COOKIE_DOMAIN,
      },
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.roles = (user as { roles?: string[] }).roles ?? ["user"];
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { roles?: string[] }).roles = token.roles as string[];
      }
      return session;
    },
  },
};
