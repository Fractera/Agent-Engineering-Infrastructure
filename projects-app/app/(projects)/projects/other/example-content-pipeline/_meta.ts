import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field. Reference example (step 223.C.2).
const meta: RouteMeta = {
  kind: "page",
  path: "/projects/other/example-content-pipeline",
  filePath: "app/app/(projects)/projects/other/example-content-pipeline/page.tsx",
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
  sharedComponents: ["_shared/components/diagram-panel.client"],

  hasLoading: false,
  hasError: false,
  hasNotFound: false,
  hasLayout: true,

  methods: [],

  description: "Reference example for the node -> functions contract (step 223.C.2): a Master diagram of three co-located nodes.",
  dataDependencies: [],
  relatedRoutes: ["/projects/other"],
  notes:
    "Reference example (step 223.C.2). Renders DiagramPanel directly from _data/diagram.ts, which " +
    "assembles three co-located nodes (_nodes/find-sources, _nodes/prepare-content, _nodes/publish). " +
    "Static content; no force-dynamic.",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
