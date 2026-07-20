import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field. Frozen automation skeleton v1.
const meta: RouteMeta = {
  kind: "page",
  path: "/projects/other/test-stream-frozen-starter",
  filePath: "app/app/(projects)/projects/other/test-stream-frozen-starter/page.tsx",
  status: "live",
  todo: [],

  visibility: "private",
  roles: ["architect", "manager"],
  unauthorizedRedirect: "auth-service /register?requireRole=architect",
  enforcedBy: "component",

  isDynamicRoute: false,
  segmentParams: [],
  pathParams: [],
  dynamicParams: undefined,
  prerenderedParams: undefined,
  routeGroup: "(projects)",
  parallelSlot: undefined,
  parentLayout: "app/app/(projects)/layout.tsx",

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
    jsonLd: [], robots: "noindex, nofollow",
  },

  i18n: { localized: false, locales: [], defaultLocale: undefined },

  queryParams: [],

  entryComponent: "_components/index.tsx",
  pageIsClient: false,
  entryIsClient: false,
  localComponents: ["index"],
  sharedComponents: [],

  hasLoading: false,
  hasError: false,
  hasNotFound: false,
  hasLayout: true,

  methods: [],

  description: "Тестовая автоматизация типа Stream, рождённая из замороженного стартера — для проверки синхронизации сервера с локальной папкой.",
  dataDependencies: [],
  relatedRoutes: ["/projects/other"],
  notes:
    "Projects-layer route: monolingual (site default language, outside [lang]); a project = a NAMED " +
    "folder /projects/other/test-stream-frozen-starter — dynamic segments are forbidden (§3.12). Grown node by " +
    "node from the frozen automation skeleton (v2: title + description + input-channel declaration).",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
