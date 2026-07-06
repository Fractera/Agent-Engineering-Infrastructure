import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
// Project page of the Projects layer (§3.12): a private application level for
// the architect / project administrator. The folder name IS the project slug.
const meta: RouteMeta = {
  kind: "page",
  path: "/projects/{{CATEGORY}}/{{PROJECT}}",
  filePath: "app/app/(projects)/projects/{{CATEGORY}}/{{PROJECT}}/page.tsx",
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
  localComponents: [
    "index",
    "process-flow.client",
    "process-queue-table.server",
    "records-table.client",
    "record-cell.client",
  ],
  sharedComponents: [],

  hasLoading: false,
  hasError: false,
  hasNotFound: false,
  hasLayout: false,

  methods: [],

  description: {{PROJECT_PURPOSE}},
  dataDependencies: [
    "_data/description.ts + _data/flow.ts (declarative page data)",
    "_lib/project-data.ts (cron queue + results — substrate tables, empty until wired)",
  ],
  relatedRoutes: ["/projects/{{CATEGORY}}"],
  notes:
    "Projects-layer route: monolingual (site default language, outside [lang]); " +
    "access architect+manager inherited from the zone layout. Composed from the " +
    "frozen project-page primitive; diagram/table finishing is a coding-agent task.",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
