// THE route descriptor standard (step 101.A).
//
// ONE maximal superset that must describe ANY route in the project — every page
// and endpoint that exists today or may exist long-term (including a route that
// is only *declared* and not built yet, per ARCHITECTURE §3.11). It is a fixed
// standard: every key is always present. For a route a field does not apply, set
// it to `undefined` / `[]` / `null` — never delete the key. The scanner later
// fills/cross-checks the mechanical fields and reports any drift.
//
// Typing lives here (one place); each route's `_meta.ts` imports `RouteMeta`,
// annotates with it, and fills the standard.

export type Role = "guest" | "user" | "architect"
export type Rendering = "static" | "dynamic" | "isr"
export type Runtime = "nodejs" | "edge"
export type EnforcedBy = "proxy" | "component" | "both"
export type RouteStatus = "live" | "requested" | "wip" | "deprecated"
export type CacheMode = "use-cache" | "force-cache" | "no-store" | "default"

export type Param = {
  name: string
  description: string
  required: boolean
}

export type SeoMeta = {
  /** Gate: whether the meta-generation mechanism is inserted for this route. */
  supportsSeo: boolean
  /** robots index/noindex. */
  indexable: boolean
  inSitemap: boolean
  /** Explicit canonical when it differs from the path; null = self/none. */
  canonical: string | null
  title: string | undefined
  /** Meta description (may differ from the human `description` below). */
  metaDescription: string | undefined
  openGraph: boolean
  ogImage: string | null
  /** Names of JSON-LD structured-data schemas emitted; [] when none. */
  jsonLd: string[]
  /** Explicit robots directive override; undefined = default. */
  robots: string | undefined
}

export type I18nMeta = {
  localized: boolean
  /** Locale codes served; [] when not localized. */
  locales: string[]
  defaultLocale: string | undefined
}

// The standard. Every key is mandatory (present); "not applicable" is expressed
// by value (undefined / [] / null), never by omission.
export type RouteMeta = {
  // — Identity & lifecycle —
  kind: "page" | "api"
  path: string                 // "/dashboard", "/products/[id]"
  filePath: string             // from app root: "app/app/dashboard/page.tsx"
  status: RouteStatus          // "requested" covers a declared-not-built route (§3.11)
  /** Free-form tasks describing what this route should become — the build intent.
   *  Populated while status is "requested"/"wip"; emptied once "live". Drives the
   *  §3.11 loop: the owner declares it from the architect, an agent reads it,
   *  opens a step, plans and builds the page, then clears the list. */
  todo: string[]

  // — Access control —
  visibility: "public" | "private"
  roles: Role[]                        // [] when public
  unauthorizedRedirect: string | undefined
  enforcedBy: EnforcedBy | undefined

  // — Routing shape —
  isDynamicRoute: boolean
  segmentParams: string[]              // ["id"]; [] when static
  pathParams: Param[]                  // segment params with meaning; []
  dynamicParams: boolean | undefined   // Next: allow params outside generateStaticParams
  prerenderedParams: string[] | undefined  // generateStaticParams output
  routeGroup: string | undefined       // (group)
  parallelSlot: string | undefined     // @slot
  parentLayout: string | undefined

  // — Rendering & caching —
  rendering: Rendering
  revalidate: number | undefined       // seconds; only isr
  runtime: Runtime
  maxDuration: number | undefined
  preferredRegion: string | undefined
  cache: CacheMode | undefined         // Next 16.2 caching model
  fetchCache: string | undefined
  revalidateTags: string[]             // []

  // — SEO —
  seo: SeoMeta

  // — i18n —
  i18n: I18nMeta

  // — Inputs —
  queryParams: Param[]                 // [] when none

  // — Composition (the _components convention) —
  entryComponent: string               // default "_components/index.tsx"
  pageIsClient: boolean                // "use client" in page.tsx = violation
  entryIsClient: boolean               // "use client" in the entry component
  localComponents: string[]            // names under _components/; []
  sharedComponents: string[]           // shared components consumed; []

  // — Segment boundaries —
  hasLoading: boolean
  hasError: boolean
  hasNotFound: boolean
  hasLayout: boolean

  // — API —
  methods: string[]                    // ["GET","POST"]; [] for pages

  // — Knowledge —
  description: string
  dataDependencies: string[]           // services / DB it reads; []
  relatedRoutes: string[]              // []
  notes: string | undefined

  // — Audit —
  owner: string | undefined
  createdBy: string | undefined
  createdAt: string | undefined        // ISO; undefined when unknown
  updatedAt: string | undefined
}

// What the detail panel renders: the standard plus any drift the scanner found
// between the authored values and the code on disk (mismatches, rule violations).
export type RouteInfo = RouteMeta & { drift: string[] }
