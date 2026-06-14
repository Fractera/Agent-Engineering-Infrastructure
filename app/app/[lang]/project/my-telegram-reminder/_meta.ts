import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
// First page of the my-telegram-reminder project — a real, static, named route.
const meta: RouteMeta = {
  kind: "page",
  path: "/project/my-telegram-reminder",
  filePath: "app/app/project/my-telegram-reminder/page.tsx",
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
  parentLayout: "app/app/layout.tsx",

  rendering: "static",
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

  description:
    "Template page of the my-telegram-reminder project — a real static named route, " +
    "seed for the Telegram-to-vector-store feature an agent grows later (§3.12).",
  dataDependencies: [],
  relatedRoutes: [],
  notes: "Project pages are real named routes — dynamic routes are forbidden here (§3.12).",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
