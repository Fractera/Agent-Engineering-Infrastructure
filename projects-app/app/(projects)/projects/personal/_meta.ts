import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
// Category hub of the Projects layer (§3.12): private application levels for the
// architect / project administrator. Categories always exist, even when empty.
const meta: RouteMeta = {
  kind: "page",
  path: "/projects/personal",
  filePath: "app/app/(projects)/projects/personal/page.tsx",
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
  sharedComponents: ["_shared/category-hub.server", "_shared/categories"],

  hasLoading: false,
  hasError: false,
  hasNotFound: false,
  hasLayout: true,

  methods: [],

  description:
    "Personal-effectiveness category hub of the Projects layer — private productivity tools for the owner.",
  dataDependencies: ["filesystem: project folders under app/(projects)/projects/personal/"],
  relatedRoutes: ["/projects/automation", "/projects/fractera-pages", "/projects/personal", "/projects/other"],
  notes:
    "Projects-layer route: monolingual (site default language, outside [lang]); " +
    "a project = a NAMED folder /projects/personal/<project-slug> — dynamic segments " +
    "are forbidden in this layer (§3.12). Folder name = project slug (source of truth).",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
