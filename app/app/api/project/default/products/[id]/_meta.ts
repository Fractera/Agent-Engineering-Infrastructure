import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
const meta: RouteMeta = {
  kind: "api",
  path: "/api/project/default/products/[id]",
  filePath: "app/app/api/project/default/products/[id]/route.ts",
  status: "live",
  todo: [],

  visibility: "private",
  roles: ["user", "architect"],
  unauthorizedRedirect: undefined,
  enforcedBy: "proxy",

  isDynamicRoute: true,
  segmentParams: ["id"],
  pathParams: [{ name: "id", description: "Product primary key (products.id).", required: true }],
  dynamicParams: true,
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

  methods: ["DELETE"],

  description:
    "Delete one product by id. DELETE removes the row from the SQLite 'products' " +
    "table and returns { ok: true } (idempotent — deleting a missing id still " +
    "succeeds). The dynamic [id] segment is the product's primary key. Called from " +
    "the /dashboard product table's delete action. The media file referenced by the " +
    "product is not removed here (media lifecycle is separate).",
  dataDependencies: ["app.db (products table, lib/db)"],
  relatedRoutes: ["/dashboard", "/api/project/default/products"],
  notes: "Idempotent delete; does not cascade to the linked media file.",

  owner: undefined,
  createdBy: undefined,
  createdAt: undefined,
  updatedAt: undefined,
}

export default meta
