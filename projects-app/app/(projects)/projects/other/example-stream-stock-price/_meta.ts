import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field. Reference example (step 243).
const meta: RouteMeta = {
  kind: "page",
  path: "/projects/other/example-stream-stock-price",
  filePath: "app/app/(projects)/projects/other/example-stream-stock-price/page.tsx",
  status: "live",
  todo: [],

  visibility: "private",
  roles: ["architect", "manager"],
  unauthorizedRedirect: "auth-service /register?requireRole=architect",
  enforcedBy: "component",

  isDynamicRoute: false,
  segmentParams: [],
  pathParams: [],
  dynamicParams: undefined,
  prerenderedParams: undefined,
  routeGroup: "(projects)",
  parallelSlot: undefined,
  parentLayout: "app/app/(projects)/layout.tsx",

  rendering: "static",
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
    jsonLd: [], robots: "noindex, nofollow",
  },

  i18n: { localized: false, locales: [], defaultLocale: undefined },

  queryParams: [],

  entryComponent: "_components/index.tsx",
  pageIsClient: false,
  entryIsClient: false,
  localComponents: ["index"],
  sharedComponents: ["_shared/components/diagram-section.client", "_shared/components/activation-layer.client"],

  hasLoading: false,
  hasError: false,
  hasNotFound: false,
  hasLayout: true,

  methods: [],

  description: "Reference example for the STREAM automation type (step 243): a Master diagram of three co-located nodes, proven with a real (non-AI) external HTTP call and a live dashboard table.",
  dataDependencies: [],
  relatedRoutes: ["/projects/other", "/projects/other/example-content-pipeline"],
  notes:
    "Reference example (step 243), the Stream counterpart of other/example-content-pipeline (Instanced). " +
    "Renders DiagramSection from _data/diagram.ts, which assembles three co-located nodes " +
    "(_nodes/parse-request, _nodes/lookup-price, _nodes/record-result). The launch console is mounted by " +
    "the projects-zone layout (automation-page-chrome.client.tsx), not this page. Static content; no " +
    "force-dynamic.",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
