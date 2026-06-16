import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
const meta: RouteMeta = {
  kind: "api",
  path: "/api/platform/signature",
  filePath: "app/app/api/platform/signature/route.ts",
  status: "live",
  todo: [],

  visibility: "public",
  roles: [],
  unauthorizedRedirect: undefined,
  enforcedBy: undefined,

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
    "Public platform-config signature for the client reload poller. GET returns " +
    "{ reloadNonce } from platform-config.json. An 'apply now' write (footer-slot MCP or " +
    "Admin -> Platform) bumps the nonce; ConfigReloadWatcher in the root layout polls this and " +
    "reloads open tabs when the value changes from the one it booted with. Read-only, no secrets, " +
    "left open by the secure-mode proxy (like /api/health).",
  dataDependencies: ["PLATFORM-CONFIG/platform-config.json"],
  relatedRoutes: [],
  notes: "Keep trivial and public — it is polled by every open tab on a short interval.",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
