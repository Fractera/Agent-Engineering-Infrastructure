import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
// Group-automations hub of the Projects layer (step 238): a cross-category listing of every "chained" type
// automation, regardless of which real category folder it lives in. NOT one of the four permanent categories
// (§3.12) — it holds no projects of its own, it only lists ones that already exist elsewhere.
const meta: RouteMeta = {
  kind: "page",
  path: "/projects/groups",
  filePath: "app/app/(projects)/projects/groups/page.tsx",
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
  sharedComponents: ["_shared/groups-hub.server", "_shared/groups-manifest", "_shared/categories"],

  hasLoading: false,
  hasError: false,
  hasNotFound: false,
  hasLayout: true,

  methods: [],

  description:
    "Cross-category listing of every chained (group) automation, regardless of which real category it lives in.",
  dataDependencies: ["filesystem: project folders across all category directories under app/(projects)/projects/"],
  relatedRoutes: ["/projects", "/projects/automation", "/projects/fractera-pages", "/projects/personal", "/projects/other"],
  notes:
    "Read/navigate-only — no creation entry point here (chained-type creation is canvas-only, see " +
    "create-automation-card.client.tsx). Not a category: it is never widened by POST /api/projects/categories " +
    "and never appears in PROJECT_CATEGORIES/ProjectCategorySlug.",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
