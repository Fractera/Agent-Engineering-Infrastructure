import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
const meta: RouteMeta = {
  kind: "api",
  path: "/api/project/default/architecture/requested/[id]",
  filePath: "app/app/api/project/default/architecture/requested/[id]/route.ts",
  status: "live",
  todo: [],

  visibility: "private",
  roles: ["user", "admin"],
  unauthorizedRedirect: undefined,
  enforcedBy: "proxy",

  isDynamicRoute: true,
  segmentParams: ["id"],
  pathParams: [{ name: "id", description: "Declared route id to remove.", required: true }],
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

  description: "Remove a declared route (page/endpoint) + its tasks — 'Remove declaration' (step 107).",
  dataDependencies: ["filesystem: route README.md"],
  relatedRoutes: ["/architecture"],
  notes: "Real deletion of a draft, not a request-flag.",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
