import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
const meta: RouteMeta = {
  kind: "api",
  path: "/api/media/[id]/file",
  filePath: "app/app/api/media/[id]/file/route.ts",
  status: "live",
  todo: [],

  visibility: "private",
  roles: ["user", "architect"],
  unauthorizedRedirect: undefined,
  enforcedBy: "proxy",

  isDynamicRoute: true,
  segmentParams: ["id"],
  pathParams: [{ name: "id", description: "Media item id (content-addressed, stable).", required: true }],
  dynamicParams: true,
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
    "Serve a stored media file. GET streams the binary for the given media [id] " +
    "back from the Data/Media service (:3300), preserving its content-type and " +
    "adding an immutable one-year cache header (files are content-addressed, so the " +
    "URL never changes). Authenticates to the service with X-Data-Secret (or the " +
    "caller's cookie). Returns the upstream status on miss, 502 on a fetch error. " +
    "This is the URL /api/media/upload rewrites to, so product images render " +
    "through the app rather than hitting the media service directly.",
  dataDependencies: ["Data/Media service :3300 (REMOTE_DATA_URL / DATA_API_KEY)"],
  relatedRoutes: ["/api/media/upload", "/dashboard"],
  notes: "Sets HTTP header 'Cache-Control: public, max-age=31536000, immutable' — safe because media ids are stable/content-addressed.",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
