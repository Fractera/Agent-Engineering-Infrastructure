import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
const meta: RouteMeta = {
  kind: "page",
  path: "/development-steps",
  filePath: "app/app/development-steps/page.tsx",
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
  localComponents: ["development-steps-app.client"],
  sharedComponents: [],

  hasLoading: false,
  hasError: false,
  hasNotFound: false,
  hasLayout: true,

  methods: [],

  description:
    "Development steps — the project's work log as real files (DEVELOPMENT-STEPS/), " +
    "mirroring /architecture. NEW STEPS are editable (name, description, importance, " +
    "to-do); COMPLETED STEPS are read-only history with a completion date. An agent " +
    "reads and writes these files; the page polls the filesystem and highlights changes.",
  dataDependencies: ["filesystem: DEVELOPMENT-STEPS/ (project root)", "/api/development-steps"],
  relatedRoutes: ["/api/development-steps/signature", "/architecture"],
  notes: "Filesystem-backed (no DB), same model as the architecture tree (step 108).",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
