import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
const meta: RouteMeta = {
  kind: "page",
  path: "/glossary",
  filePath: "app/app/glossary/page.tsx",
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
  localComponents: ["glossary-app.client"],
  sharedComponents: [],

  hasLoading: false,
  hasError: false,
  hasNotFound: false,
  hasLayout: true,

  methods: [],

  description:
    "Glossary editor — approve abbreviations / preferred phrasings (key→meaning) so " +
    "every agent reads them the same way (e.g. aws → ai-workspace). Admin-only service page.",
  dataDependencies: ["filesystem: GLOSSARY.md (project root)", "/api/glossary"],
  relatedRoutes: ["/api/glossary"],
  notes: "Admin-only. Edits write the real GLOSSARY.md file agents read.",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
