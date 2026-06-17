import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
// See @/lib/architecture/route-meta. Fill what applies; leave the rest as
// undefined / [] / null. Never remove a key.
const meta: RouteMeta = {
  // — Identity & lifecycle —
  kind: "page",
  path: "/ai-core",
  filePath: "app/app/ai-core/page.tsx",
  status: "live",
  todo: [],

  // — Access control —
  visibility: "private",
  roles: ["architect"],
  unauthorizedRedirect: "/register?requireRole=architect",
  enforcedBy: "both",

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
  cache: "no-store",
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
  entryComponent: "_components/index.tsx",
  pageIsClient: false,
  entryIsClient: false,
  localComponents: ["ai-core-app.client"],
  sharedComponents: [
    "@/components/architecture/tree-view.client",
    "@/components/architecture/detail-panel.client",
    "@/components/architecture/jump-bar.client",
  ],

  // — Segment boundaries —
  hasLoading: false,
  hasError: false,
  hasNotFound: false,
  hasLayout: true,

  // — API —
  methods: [],

  // — Knowledge —
  description:
    "Live state of the AI core — agents, bridges, memory, MCP, tools — drawn by " +
    "request flow as a file-explorer tree with a quick-jump bar.",
  dataDependencies: ["lib/architecture (curated seed)"],
  relatedRoutes: ["/architecture"],
  notes: undefined,

  // — Audit —
  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
