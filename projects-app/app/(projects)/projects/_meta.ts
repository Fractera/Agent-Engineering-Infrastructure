import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
// Root index of the Projects layer (§3.12, step 211 Ф0): lists the four permanent
// categories with live project counts. Private application levels for the
// architect / project administrator.
const meta: RouteMeta = {
  kind: "page",
  path: "/projects",
  filePath: "app/app/(projects)/projects/page.tsx",
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
  sharedComponents: ["_shared/projects-index.server", "_shared/categories", "_shared/projects-manifest", "_shared/project-card"],

  hasLoading: false,
  hasError: false,
  hasNotFound: false,
  hasLayout: true,

  methods: [],

  description:
    "Root index of the Projects layer — the four permanent categories with live project counts and names.",
  dataDependencies: ["filesystem: project folders under app/(projects)/projects/<category>/"],
  relatedRoutes: ["/projects/automation", "/projects/fractera-pages", "/projects/personal", "/projects/other"],
  notes:
    "Projects-layer route: monolingual (site default language, outside [lang]); " +
    "categories are permanent and present even when empty (§3.12).",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
