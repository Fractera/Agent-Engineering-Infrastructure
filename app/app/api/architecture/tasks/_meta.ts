import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
const meta: RouteMeta = {
  kind: "api",
  path: "/api/architecture/tasks",
  filePath: "app/app/api/architecture/tasks/route.ts",
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

  queryParams: [
    { name: "path", description: "Route path to list tasks for.", required: true },
    { name: "kind", description: "Filter by 'todo' or 'delete'.", required: false },
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

  methods: ["GET", "POST"],

  description:
    "Per-route tasks on existing pages: ongoing to-dos and danger-zone deletion " +
    "requests — flags an agent picks up. Same write path for the UI and agents.",
  dataDependencies: ["app.db (route_tasks)"],
  relatedRoutes: ["/architecture", "/api/architecture/requested"],
  notes: "Deletion is a planned request, not a destructive function.",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
