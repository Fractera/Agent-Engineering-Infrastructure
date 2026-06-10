import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
const meta: RouteMeta = {
  kind: "api",
  path: "/api/project/default/products",
  filePath: "app/app/api/project/default/products/route.ts",
  status: "live",
  todo: [],

  visibility: "private",
  roles: ["user", "admin"],
  unauthorizedRedirect: undefined,
  enforcedBy: "proxy",

  isDynamicRoute: false,
  segmentParams: [],
  pathParams: [],
  dynamicParams: undefined,
  prerenderedParams: undefined,
  routeGroup: undefined,
  parallelSlot: undefined,
  parentLayout: undefined,

  rendering: "dynamic",
  revalidate: undefined,
  runtime: "nodejs",
  maxDuration: undefined,
  preferredRegion: undefined,
  cache: undefined,
  fetchCache: undefined,
  revalidateTags: [],

  seo: {
    supportsSeo: false, indexable: false, inSitemap: false, canonical: null,
    title: undefined, metaDescription: undefined, openGraph: false, ogImage: null,
    jsonLd: [], robots: undefined,
  },

  i18n: { localized: false, locales: [], defaultLocale: undefined },

  queryParams: [],

  entryComponent: "route.ts",
  pageIsClient: false,
  entryIsClient: false,
  localComponents: [],
  sharedComponents: [],

  hasLoading: false,
  hasError: false,
  hasNotFound: false,
  hasLayout: false,

  methods: ["GET", "POST"],

  description:
    "Demo product catalogue (the starter content of the /dashboard page). GET lists " +
    "products newest-first; POST creates one from { name, price, media_id?, " +
    "media_url? } (400 if name or price is missing) and stamps created_by from the " +
    "session. Backed by the SQLite 'products' table (lib/db). This is the worked " +
    "example of the platform's database + media capability an owner reshapes into " +
    "their own product. Project-scoped under the default project (§3.12).",
  dataDependencies: ["app.db (products table, lib/db)"],
  relatedRoutes: ["/dashboard", "/api/project/default/products/[id]", "/api/media/upload"],
  notes: "Catalogue demo — the 'products' table is intentionally kept (not part of the architecture filesystem migration).",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
