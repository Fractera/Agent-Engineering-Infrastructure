import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
// See @/lib/architecture/route-meta. Fill what applies; leave the rest as
// undefined / [] / null. Never remove a key.
const meta: RouteMeta = {
  // — Identity & lifecycle —
  kind: "page",
  path: "/",
  filePath: "app/app/page.tsx",
  status: "live",
  todo: [],

  // — Access control —
  visibility: "public",
  roles: [],
  unauthorizedRedirect: undefined,
  enforcedBy: undefined,

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
  rendering: "static",
  revalidate: undefined,
  runtime: "nodejs",
  maxDuration: undefined,
  preferredRegion: undefined,
  cache: undefined,
  fetchCache: undefined,
  revalidateTags: [],

  // — SEO —
  seo: {
    supportsSeo: true,
    indexable: true,
    inSitemap: true,
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
  entryComponent: "_components/index.tsx",
  pageIsClient: false,
  entryIsClient: false,
  localComponents: ["shell-home.client"],
  sharedComponents: [],

  // — Segment boundaries —
  hasLoading: false,
  hasError: false,
  hasNotFound: true,
  hasLayout: true,

  // — API —
  methods: [],

  // — Knowledge —
  description:
    "Public landing — the starter template the owner turns into their product. " +
    "Animated hero with the stack pills and quick links into the workspace.",
  dataDependencies: [],
  relatedRoutes: ["/dashboard", "/ai-core", "/architecture", "/debug"],
  notes: undefined,

  // — Audit —
  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
