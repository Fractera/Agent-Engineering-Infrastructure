import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
const meta: RouteMeta = {
  kind: "page",
  path: "/glossary",
  filePath: "app/app/glossary/page.tsx",
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
  localComponents: ["glossary-app.client"],
  sharedComponents: [],

  hasLoading: false,
  hasError: false,
  hasNotFound: false,
  hasLayout: true,

  methods: [],

  description:
    "Glossary editor — approve abbreviations / preferred phrasings (key→meaning) so " +
    "every agent reads them the same way (e.g. aws → ai-workspace). Public (temporary).",
  dataDependencies: ["app.db (glossary)", "/api/glossary"],
  relatedRoutes: ["/api/glossary", "/api/glossary/[id]"],
  notes: "Temporarily public. Global workspace glossary; an agent ingests it into Company Brain.",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
