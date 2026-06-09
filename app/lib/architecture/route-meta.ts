// The typed contract for a route's information sector (step 101.A).
// Two halves, kept apart on purpose:
//   - RouteMeta  — authored intent, co-located per route as `_meta.ts`
//     (`export default { … } satisfies RouteMeta`). What the code cannot tell
//     you: purpose, who may reach it, what the query params mean.
//   - RouteFacts — derived by scanning the code on disk. Never hand-written, so
//     it cannot drift from reality: path, rendering, client/server, methods…
// The detail panel renders RouteInfo = RouteFacts + RouteMeta + drift[], where
// drift surfaces any mismatch between the two — the panel doubles as a linter.

export type Role = "guest" | "user" | "admin"
export type Rendering = "static" | "dynamic" | "isr"

// Visibility carries roles only when private — the type makes "roles required
// iff private" impossible to violate.
export type Visibility =
  | { visibility: "public" }
  | { visibility: "private"; roles: Role[] }

// Rendering carries a revalidate window only for ISR — same trick.
export type RenderMode =
  | { rendering: "static" | "dynamic" }
  | { rendering: "isr"; revalidate: number }

export type QueryParam = { name: string; description: string }

export type SeoMeta = {
  /** Should search engines index it (robots index/noindex). */
  indexable: boolean
  /** Listed in the sitemap. */
  inSitemap: boolean
  /** Explicit canonical, when it differs from the route path. */
  canonical?: string
}

// Authored, co-located as `_meta.ts`. Everything here is intent the scanner
// cannot infer from code.
export type RouteMeta = Visibility & RenderMode & {
  /** One compact sentence: what this route is for. */
  description: string
  seo: SeoMeta
  /** Query params the route reads, with meaning. Reading any forces dynamic. */
  queryParams?: QueryParam[]
  /** Override the derived entry component. Default is `_components/index.tsx`. */
  entryComponent?: string
}

// Derived by the scanner from the code on disk. The source of truth for facts.
export type RouteFacts = {
  /** URL path, dynamic segments kept as written, e.g. /products/[id]. */
  path: string
  /** File backing the route, from the app root, e.g. app/dashboard/page.tsx. */
  filePath: string
  kind: "page" | "api"
  /** The route contains a [param] segment. */
  segmentDynamic: boolean
  /** Names of dynamic segments, e.g. ["id"]. */
  segmentParams: string[]
  /** page.tsx / route.ts carries "use client" (a violation for a page). */
  isClientComponent: boolean
  /** Exports metadata / generateMetadata (the App-Router SEO mechanism). */
  hasMetadataExport: boolean
  /** A loading.tsx Suspense boundary sits beside the route. */
  hasLoading: boolean
  /** An error.tsx boundary sits beside the route. */
  hasError: boolean
  /** A _components/ folder sits beside the route. */
  hasComponentsDir: boolean
  /** The resolved entry component, or null when _components/index is absent. */
  entryComponent: string | null
  /** The entry component carries "use client". */
  entryIsClient: boolean
  /** Rendering inferred from `export const dynamic`/`revalidate`. */
  detectedRendering?: Rendering
  /** HTTP methods exported by a route.ts (api only). */
  methods?: string[]
}

// What the detail panel renders: facts + (optional) authored meta + any drift
// between them (mismatches and rule violations).
export type RouteInfo = RouteFacts & {
  meta?: RouteMeta
  drift: string[]
}
