import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
const meta: RouteMeta = {
  kind: "api",
  path: "/api/project/default/source",
  filePath: "app/app/api/project/default/source/route.ts",
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

  queryParams: [
    { name: "path", description: "Route path whose source to read.", required: true },
  ],

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
    "Read-only source bundle (page + _components) for the /architecture code " +
    "viewer (§3.13). Never writes; edits become route_tasks requests.",
  dataDependencies: ["filesystem: app/app/<route> (read-only)"],
  relatedRoutes: ["/architecture", "/api/project/default/architecture/tasks"],
  notes: "Screen translation — code is never executed and files are never modified here.",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
