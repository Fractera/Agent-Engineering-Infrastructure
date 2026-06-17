import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
const meta: RouteMeta = {
  kind: "page",
  path: "/documents",
  filePath: "app/app/documents/page.tsx",
  status: "live",
  todo: [],

  visibility: "private",
  roles: ["architect"],
  unauthorizedRedirect: "/register?requireRole=architect",
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
  localComponents: ["documents-app.client"],
  sharedComponents: ["crud-docs/docs-tree.client", "crud-docs/doc-preview.client", "crud-docs/folder-tools.client"],

  hasLoading: false,
  hasError: false,
  hasNotFound: false,
  hasLayout: true,

  methods: [],

  description:
    "Documents — the knowledge base file manager. A real folder/file tree of any depth under " +
    "CRUD-DOCS/ (project root): create folders, upload .txt/.md/.doc/.docx, preview, delete. " +
    "Unlike the other filesystem pages there is no staging — every action changes disk for real. " +
    "Documents are tracked by git and sync with the repo; activating one ingests it into " +
    "Company Memory (LightRAG) so every agent can recall it.",
  dataDependencies: ["filesystem: CRUD-DOCS/ (project root)", "/api/documents", "LightRAG :9621 (activate)"],
  relatedRoutes: ["/ai-core", "/glossary", "/architecture"],
  notes: "Real filesystem CRUD (no DB, no staging). CRUD-DOCS/ is tracked by git and syncs with the repo.",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
