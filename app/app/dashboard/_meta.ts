import type { RouteMeta } from "@/lib/architecture/route-meta"

// Authored intent for /dashboard. Facts (path, rendering, client/server) are
// derived by the scanner — only what the code cannot tell us lives here.
// visibility "private" describes the SECURE-mode contract; in IP/insecure mode
// auth is bypassed (open onboarding), which is a mode concern, not a route one.
const meta = {
  description:
    "Product catalogue demo — create, list and delete products with image " +
    "upload. Exercises the SQLite database and the media service.",
  visibility: "private",
  roles: ["user", "admin"],
  rendering: "dynamic",
  seo: { indexable: false, inSitemap: false },
} satisfies RouteMeta

export default meta
