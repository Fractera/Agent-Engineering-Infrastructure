import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
const meta: RouteMeta = {
  kind: "page",
  path: "/patterns",
  filePath: "app/app/patterns/page.tsx",
  status: "live",
  todo: [],

  visibility: "private",
  roles: ["admin"],
  unauthorizedRedirect: "/register?requireRole=admin",
  enforcedBy: "both",

  isDynamicRoute: false,
  segmentParams: [],
  pathParams: [],
  dynamicParams: undefined,
  prerenderedParams: undefined,
  routeGroup: undefined,
  parallelSlot: undefined,
  parentLayout: "app/app/layout.tsx",

  rendering: "dynamic",
  revalidate: undefined,
  runtime: "nodejs",
  maxDuration: undefined,
  preferredRegion: undefined,
  cache: "no-store",
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
  localComponents: ["patterns-app.client"],
  sharedComponents: [],

  hasLoading: false,
  hasError: false,
  hasNotFound: false,
  hasLayout: true,

  methods: [],

  description:
    "Patterns & Anti-patterns — reusable code examples as real files (PATTERNS/), " +
    "mirroring /architecture. PATTERNS is a one-level tree (categories → patterns: " +
    "UI Elements, Sections, Brandbook); the AI reuses them while building. " +
    "ANTI-PATTERNS is a flat list of deployment pitfalls the AI reads before deploying. " +
    "Two-stage like /architecture: a request declares a pattern (orange + req), an agent " +
    "fills it in. The page polls the filesystem and highlights changes.",
  dataDependencies: ["filesystem: PATTERNS/ (project root)", "/api/patterns"],
  relatedRoutes: ["/api/patterns/signature", "/architecture", "/development-steps"],
  notes: "Filesystem-backed (no DB), same model as the architecture tree (step 108) and development steps (step 109).",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
