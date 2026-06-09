import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
// This is the project-wide standard (see @/lib/architecture/route-meta). It must
// cover every route, now and long-term. Fill the fields that apply; leave the
// rest as undefined / [] / null — never remove a key. The scanner cross-checks
// the mechanical fields and flags drift.
const meta: RouteMeta = {
  // — Identity & lifecycle —
  kind: "page",
  path: "/dashboard",
  filePath: "app/app/dashboard/page.tsx",
  status: "live",

  // — Access control —
  visibility: "private",
  roles: ["user", "admin"],
  unauthorizedRedirect: "/register?requireRole=user",
  enforcedBy: "component",

  // — Routing shape —
  isDynamicRoute: false,
  segmentParams: [],
  pathParams: [],
  dynamicParams: undefined,
  prerenderedParams: undefined,
  routeGroup: undefined,
  parallelSlot: undefined,
  parentLayout: "app/app/layout.tsx",

  // — Rendering & caching —
  rendering: "dynamic",
  revalidate: undefined,
  runtime: "nodejs",
  maxDuration: undefined,
  preferredRegion: undefined,
  cache: undefined,
  fetchCache: undefined,
  revalidateTags: [],

  // — SEO —
  seo: {
    supportsSeo: false,
    indexable: false,
    inSitemap: false,
    canonical: null,
    title: undefined,
    metaDescription: undefined,
    openGraph: false,
    ogImage: null,
    jsonLd: [],
    robots: undefined,
  },

  // — i18n —
  i18n: {
    localized: false,
    locales: [],
    defaultLocale: undefined,
  },

  // — Inputs —
  queryParams: [],

  // — Composition —
  entryComponent: "_components/index.tsx",
  pageIsClient: false,
  entryIsClient: false,
  localComponents: [
    "dashboard-app.client",
    "product-form.client",
    "product-table.client",
    "types",
  ],
  sharedComponents: ["@/services/upload/file-upload-field.client"],

  // — Segment boundaries —
  hasLoading: false,
  hasError: false,
  hasNotFound: false,
  hasLayout: true,

  // — API —
  methods: [],

  // — Knowledge —
  description:
    "Product catalogue demo — create, list and delete products with image " +
    "upload. Exercises the SQLite database and the media service.",
  dataDependencies: ["app.db (products)", "media service :3300"],
  relatedRoutes: ["/api/products", "/api/products/[id]", "/api/media/upload"],
  notes: undefined,

  // — Audit —
  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
