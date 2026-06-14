import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
const meta: RouteMeta = {
  kind: "page",
  path: "/ai-draft-settings",
  filePath: "app/app/ai-draft-settings/page.tsx",
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
  localComponents: ["ai-draft-app.client"],
  sharedComponents: ["ui/seg-toggle.client"],

  hasLoading: false,
  hasError: false,
  hasNotFound: false,
  hasLayout: true,

  methods: [],

  description:
    "AI Draft Settings — the intermediate layer where the architect writes free-form wishes " +
    "(supplement / replace) for the six agents' real instruction / skill / MCP files. Drafts " +
    "are real files under AI-DRAFT-SETTINGS/ (six agent folders: HERMES, CLAUDE-CODE, CODEX, " +
    "GEMINI-CLI, QWEN-CODE, KIMI-CODE; each with its instruction doc(s) + SKILLS/ + MCP/). The " +
    "left tree mirrors the real skills/MCP as read-only reference; an agent later applies the " +
    "drafts to the originals — the originals are never edited here. Static mode (no live poll).",
  dataDependencies: ["filesystem: AI-DRAFT-SETTINGS/ (project root)", "/api/ai-draft-settings"],
  relatedRoutes: ["/ai-core", "/architecture", "/patterns"],
  notes: "Filesystem-backed (no DB), same model as the architecture tree (step 108) and patterns (step 110). Static — no /signature polling by design.",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
