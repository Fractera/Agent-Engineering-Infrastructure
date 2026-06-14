import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
const meta: RouteMeta = {
  kind: "api",
  path: "/api/media/icons/[setId]/file/[name]",
  filePath: "app/app/api/media/icons/[setId]/file/[name]/route.ts",
  status: "live",
  todo: [],

  visibility: "public",
  roles: [],
  unauthorizedRedirect: undefined,
  enforcedBy: undefined,

  isDynamicRoute: true,
  segmentParams: ["setId", "name"],
  pathParams: [
    { name: "setId", description: "Generated icon-set id (icon_sets row).", required: true },
    { name: "name", description: "File name within the set (favicon.ico, icon-192.png, ...).", required: true },
  ],
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
    "Serve one file from a generated PWA/favicon icon set. GET proxies the Data/Media " +
    "service GET /media/icons/[setId]/file/[name] (favicon.ico, icon-32/192/512.png, " +
    "apple-touch-icon.png, og-image.jpg), preserving content-type and adding a one-hour " +
    "cache header. The site config (Admin -> Site Settings) stores the icon-set id; the " +
    "Shell manifest and <head> icon links resolve through this route so assets render " +
    "through the app rather than hitting the media service directly.",
  dataDependencies: ["Data/Media service :3300 (REMOTE_DATA_URL / DATA_API_KEY)"],
  relatedRoutes: ["/api/media/[id]/file", "/manifest.webmanifest"],
  notes: "Icon sets are regenerated under a new id, so a moderate cache is safe.",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
