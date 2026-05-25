import type { NextConfig } from "next";

// Path-based routing (process.env.BASE_PATH set in .env.local):
// - basePath rewrites URLs to /auth/* but conflicts with NextAuth v5
//   (it returns "Bad request." because NEXTAUTH_URL must match exactly).
// - Solution: keep auth service at root paths (no basePath in Next.js),
//   but use assetPrefix so /_next/* assets get a unique URL prefix that
//   nginx can route to the auth service exclusively.
// - Nginx config: location /_auth_next/ → 3001, location /api/auth/ → 3001,
//   location /auth/ → 3001 with rewrite ^/auth/(.*) /$1 break.
const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  ...(process.env.BASE_PATH
    ? { assetPrefix: "/_auth_next" }
    : { output: "standalone" }),
  allowedDevOrigins: ["auth.partner.fractera.local"],
};

export default nextConfig;
