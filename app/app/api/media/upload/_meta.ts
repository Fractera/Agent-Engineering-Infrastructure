import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
const meta: RouteMeta = {
  kind: "api",
  path: "/api/media/upload",
  filePath: "app/app/api/media/upload/route.ts",
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

  methods: ["POST"],

  description:
    "Image upload proxy. POST forwards the multipart form-data to the Data/Media " +
    "service (REMOTE_DATA_URL, default http://localhost:3300 → /media/upload), " +
    "authenticating with the X-Data-Secret header (or the caller's cookie when no " +
    "secret is set). On success in remote mode it rewrites the returned URL to " +
    "/api/media/<id>/file so the browser fetches the file back through this app. " +
    "Returns the service's JSON { ok, item:{ id, url } }. Used by /dashboard to " +
    "attach a picture to a product. The app never stores the file itself — the " +
    "media service owns storage.",
  dataDependencies: ["Data/Media service :3300 (REMOTE_DATA_URL / DATA_API_KEY)"],
  relatedRoutes: ["/dashboard", "/api/media/[id]/file", "/api/project/default/products"],
  notes: "Thin proxy — storage lives in the media service, not in the Shell app.",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
