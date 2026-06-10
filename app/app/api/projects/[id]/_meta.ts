import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
const meta: RouteMeta = {
  kind: "api",
  path: "/api/projects/[id]",
  filePath: "app/app/api/projects/[id]/route.ts",
  status: "live",
  todo: [],

  visibility: "private",
  roles: ["user", "admin"],
  unauthorizedRedirect: undefined,
  enforcedBy: "proxy",

  isDynamicRoute: true,
  segmentParams: ["id"],
  pathParams: [{ name: "id", description: "Project id to remove.", required: true }],
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

  methods: ["DELETE"],

  description: "Remove a declared project — 'Remove declaration' (step 107).",
  dataDependencies: ["filesystem: app/app/project/<slug>/README.md"],
  relatedRoutes: ["/api/projects", "/architecture"],
  notes: undefined,

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
