import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { Resend as ResendClient } from "resend";
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

  // Google OAuth — only active when BOTH credentials are present. An empty
  // credential (the default seeded by bootstrap) means "provider off", which
  // keeps the /api/auth/methods flag false and hides the button on /login.
  // Credentials are settable only in secure mode (Admin → Login methods).
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        // The owner's workspace is single-tenant: linking a Google sign-in to a
        // pre-existing same-email account is the desired behaviour (Google has
        // verified ownership of the address).
        allowDangerousEmailAccountLinking: true,
      })
    );
  }

  // Magic-link (Resend) — only active when an API key is present (empty = off).
  // sendVerificationRequest mirrors FES (fractera-easy-starter/lib/auth.ts).
  if (process.env.RESEND_API_KEY) {
    const from = process.env.AUTH_RESEND_FROM || "noreply@localhost";
    providers.push(
      Resend({
        apiKey: process.env.RESEND_API_KEY,
        from,
        sendVerificationRequest: async ({ identifier: email, url }) => {
          const client = new ResendClient(process.env.RESEND_API_KEY!);
          await client.emails.send({
            from,
            to: email,
            subject: "Sign in to your workspace",
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
                <h2 style="margin:0 0 16px;font-size:20px">Sign in to your workspace</h2>
                <p style="margin:0 0 24px;color:#555">Click the button below to sign in. This link expires in 24 hours.</p>
                <a href="${url}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">Sign in &rarr;</a>
                <p style="margin:24px 0 0;color:#999;font-size:12px">If you did not request this email you can safely ignore it.</p>
              </div>
            `,
          });
        },
      })
    );
  }

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
    // OAuth / magic-link complete on the auth host (auth.<domain>) but usually
    // need to land back on a sibling subdomain (the Shell or Admin). The default
    // NextAuth redirect callback only allows same-origin, which would drop a
    // cross-subdomain callbackUrl to baseUrl. Allow the configured cookie-domain
    // family (set in secure mode, e.g. ".aifa.dev") plus same-origin.
    redirect({ url, baseUrl }) {
      try {
        const target = new URL(url, baseUrl);
        const cookieDomain = process.env.COOKIE_DOMAIN;
        if (cookieDomain && cookieDomain.startsWith(".")) {
          const root = cookieDomain.slice(1);
          if (target.hostname === root || target.hostname.endsWith(`.${root}`)) {
            return target.toString();
          }
        }
        if (target.origin === baseUrl) return target.toString();
      } catch {
        // fall through to baseUrl
      }
      return baseUrl;
    },
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
