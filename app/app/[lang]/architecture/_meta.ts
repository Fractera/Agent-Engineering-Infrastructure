import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
// See @/lib/architecture/route-meta. Fill what applies; leave the rest as
// undefined / [] / null. Never remove a key.
const meta: RouteMeta = {
  // — Identity & lifecycle —
  kind: "page",
  path: "/architecture",
  filePath: "app/app/architecture/page.tsx",
  status: "live",
  todo: [],

  // — Access control —
  visibility: "private",
  roles: ["architect"],
  unauthorizedRedirect: "/register?requireRole=architect",
  enforcedBy: "both",

  // — Routing shape —
  isDynamicRoute: false,
  segmentParams: [],
  pathParams: [],
  dynamicParams: undefined,
  prerenderedParams: undefined,
  routeGroup: undefined,
  parallelSlot: undefined,
  parentLayout: "app/app/layout.tsx",

  // — Rendering & caching —
  rendering: "dynamic",
  revalidate: undefined,
  runtime: "nodejs",
  maxDuration: undefined,
  preferredRegion: undefined,
  cache: "no-store",
  fetchCache: undefined,
  revalidateTags: [],

  // — SEO —
  seo: {
    supportsSeo: false,
    indexable: false,
    inSitemap: false,
    canonical: null,
    title: undefined,
    metaDescription: undefined,
    openGraph: false,
    ogImage: null,
    jsonLd: [],
    robots: undefined,
  },

  // — i18n —
  i18n: { localized: false, locales: [], defaultLocale: undefined },

  // — Inputs —
  queryParams: [],

  // — Composition —
  entryComponent: "_components/index.tsx",
  pageIsClient: false,
  entryIsClient: false,
  localComponents: ["architecture-app.client"],
  sharedComponents: [
    "@/components/architecture/tree-view.client",
    "@/components/architecture/detail-panel.client",
    "@/components/architecture/route-detail-panel.client",
    "@/components/architecture/route-todo.client",
    "@/components/architecture/route-danger-zone.client",
    "@/components/architecture/route-source.client",
    "@/components/architecture/code-editor.client",
    "@/components/architecture/requested-detail-panel.client",
    "@/components/architecture/projects-panel.client",
    "@/components/architecture/declare-panel.client",
    "@/components/architecture/endpoint-panel.client",
    "@/components/architecture/project-picker.client",
    "@/components/architecture/source-example.client",
    "@/components/architecture/poll-bar.client",
  ],

  // — Segment boundaries —
  hasLoading: false,
  hasError: false,
  hasNotFound: false,
  hasLayout: true,

  // — API —
  methods: [],

  // — Knowledge —
  description:
    "Interactive map of the app's structure — pages and endpoints with roles, " +
    "rendering and method. 'Add page' declares a new route as a to-do (§3.11).",
  dataDependencies: [
    "lib/architecture/routes (curated seed)",
    "filesystem: app/app/** (README.md per declared route, via fs-scan)",
  ],
  relatedRoutes: ["/api/project/default/architecture/requested", "/ai-core", "/dashboard", "/debug"],
  notes: undefined,

  // — Audit —
  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
