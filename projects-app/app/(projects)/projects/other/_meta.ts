import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
// Category hub of the Projects layer (§3.12): private application levels for the
// architect / project administrator. Categories always exist, even when empty.
const meta: RouteMeta = {
  kind: "page",
  path: "/projects/other",
  filePath: "app/app/(projects)/projects/other/page.tsx",
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
    "Catch-all category hub of the Projects layer — projects outside the three fixed categories.",
  dataDependencies: ["filesystem: project folders under app/(projects)/projects/other/"],
  relatedRoutes: ["/projects/automation", "/projects/fractera-pages", "/projects/personal", "/projects/other"],
  notes:
    "Projects-layer route: monolingual (site default language, outside [lang]); " +
    "a project = a NAMED folder /projects/other/<project-slug> — dynamic segments " +
    "are forbidden in this layer (§3.12). Folder name = project slug (source of truth).",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
