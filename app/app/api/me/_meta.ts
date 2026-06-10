import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
const meta: RouteMeta = {
  kind: "api",
  path: "/api/me",
  filePath: "app/app/api/me/route.ts",
  status: "live",
  todo: [],

  visibility: "private",
  roles: ["user", "admin"],
  unauthorizedRedirect: undefined,
  enforcedBy: "component",

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
    "Current session / identity. GET resolves the caller's session via getSession " +
    "(lib/auth/get-session) and returns the session object, or 401 { error: " +
    "'Unauthorized' } when there is none. Client pages call it to learn who is " +
    "signed in and to gate UI. In IP mode getSession returns a dev user (auth " +
    "bypass), so /api/me effectively always answers; in secure mode it reflects " +
    "the real signed-in user. The single source of identity for client components.",
  dataDependencies: ["session cookie (lib/auth/get-session)"],
  relatedRoutes: ["/dashboard", "/debug"],
  notes: "Client components read identity here, not from the auth service directly.",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
