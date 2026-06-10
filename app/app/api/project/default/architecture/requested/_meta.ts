import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
// See @/lib/architecture/route-meta. Fill what applies; leave the rest as
// undefined / [] / null. Never remove a key.
const meta: RouteMeta = {
  // — Identity & lifecycle —
  kind: "api",
  path: "/api/project/default/architecture/requested",
  filePath: "app/app/api/project/default/architecture/requested/route.ts",
  status: "live",
  todo: [],

  // — Access control —
  visibility: "private",
  roles: ["user", "admin"],
  unauthorizedRedirect: undefined, // API returns 401 via proxy, no redirect
  enforcedBy: "proxy",

  // — Routing shape —
  isDynamicRoute: false,
  segmentParams: [],
  pathParams: [],
  dynamicParams: undefined,
  prerenderedParams: undefined,
  routeGroup: undefined,
  parallelSlot: undefined,
  parentLayout: undefined,

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
  i18n: { localized: false, locales: [], defaultLocale: undefined },

  // — Inputs —
  queryParams: [],

  // — Composition —
  entryComponent: "route.ts",
  pageIsClient: false,
  entryIsClient: false,
  localComponents: [],
  sharedComponents: [],

  // — Segment boundaries —
  hasLoading: false,
  hasError: false,
  hasNotFound: false,
  hasLayout: false,

  // — API —
  methods: ["GET", "POST"],

  // — Knowledge —
  description:
    "Declare and list requested routes — declared-but-not-built pages (§3.11): " +
    "a title plus a free-form todo list an agent picks up to plan and build.",
  dataDependencies: ["filesystem: README.md per declared route"],
  relatedRoutes: ["/architecture"],
  notes: "Activation (todo -> real page) is a separate step.",

  // — Audit —
  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
