import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
const meta: RouteMeta = {
  kind: "api",
  path: "/api/glossary",
  filePath: "app/app/api/glossary/route.ts",
  status: "live",
  todo: [],

  visibility: "private",
  roles: ["user", "admin"],
  unauthorizedRedirect: undefined,
  enforcedBy: "proxy",

  isDynamicRoute: false,
  segmentParams: [],
  pathParams: [],
  dynamicParams: undefined,
  prerenderedParams: undefined,
  routeGroup: undefined,
  parallelSlot: undefined,
  parentLayout: undefined,

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
    jsonLd: [], robots: undefined,
  },

  i18n: { localized: false, locales: [], defaultLocale: undefined },

  queryParams: [],

  entryComponent: "route.ts",
  pageIsClient: false,
  entryIsClient: false,
  localComponents: [],
  sharedComponents: [],

  hasLoading: false,
  hasError: false,
  hasNotFound: false,
  hasLayout: false,

  methods: ["GET", "POST"],

  description:
    "Workspace glossary (term map) — list and add terms so every agent reads " +
    "abbreviations the same way (e.g. aws → ai-workspace). Global, §3.11.",
  dataDependencies: ["app.db (glossary)"],
  relatedRoutes: ["/glossary"],
  notes: "Editable source; an agent exports/ingests it into glossary.md / Company Brain.",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
