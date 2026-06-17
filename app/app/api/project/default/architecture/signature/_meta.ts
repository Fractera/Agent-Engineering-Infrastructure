import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
const meta: RouteMeta = {
  kind: "api",
  path: "/api/project/default/architecture/signature",
  filePath: "app/app/api/project/default/architecture/signature/route.ts",
  status: "live",
  todo: [],

  visibility: "private",
  roles: ["user", "architect"],
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

  methods: ["GET"],

  description:
    "Live-poll snapshot for the architecture tree (step 106): per-path open-task " +
    "signature (count + last created_at) + declared routes + projects in one call.",
  dataDependencies: ["filesystem: app/app/** (README.md per declared entity, via fs-scan)"],
  relatedRoutes: ["/architecture"],
  notes: "Powers real-time updates + selective blink; read-only.",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
