import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { authorize, projectsRoot, scheduleRebuild } from "@/lib/nodes";
import { PROJECT_CATEGORIES } from "@/app/(projects)/projects/_shared/categories";
import { countWords, MAX_CATEGORY_DESCRIPTION_WORDS } from "@/app/(projects)/projects/_shared/word-count";
import { openAiKey, translateCategoryCopy } from "@/lib/quiz";

// CREATE A CATEGORY (step 225 G6) — the owner may need a home that none of the standing categories offers
// (the creation dialog's "+ new category"). A category is CODE, not data: a slug in the union + an entry in
// PROJECT_CATEGORIES + its own hub route. So this endpoint MATERIALIZES all of it — the same materialize-first
// spirit as a project or a node — and schedules the rebuild that serves the new hub.
//
// INVARIANTS (app/(projects)/README.md, step 215): the slug is a permanent English identifier (never renamed,
// never localized); "other" ALWAYS stays last — a new category is inserted BEFORE it.
//
// TEN-LANGUAGE GATE (step 234.1): description is capped at 200 words; title+description are translated into
// all ten admin-layer languages (rule 4г) via lib/quiz.ts translateCategoryCopy() BEFORE anything is written
// to disk — no key, or a failed translate call, means NO category is created (no English-only fallback).
export const runtime = "nodejs";

const SLUG = /^[a-z][a-z0-9-]*$/;

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ categories: PROJECT_CATEGORIES });
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { slug?: string; title?: string; description?: string } | null;
  const slug = String(body?.slug ?? "").trim().toLowerCase();
  const title = String(body?.title ?? "").trim() || slug;
  const description = String(body?.description ?? "").trim() || `Projects of the ${title} category.`;

  if (!SLUG.test(slug)) {
    return NextResponse.json({ error: "slug must be kebab-case and start with a letter" }, { status: 400 });
  }
  if (PROJECT_CATEGORIES.some((c) => c.slug === slug)) {
    return NextResponse.json({ error: `category "${slug}" already exists` }, { status: 409 });
  }
  if (countWords(description) > MAX_CATEGORY_DESCRIPTION_WORDS) {
    return NextResponse.json({ error: "description_too_long" }, { status: 400 });
  }

  // TEN-LANGUAGE TRANSLATION GATE (step 234.1) — a category is born equally available in all ten admin-
  // layer languages (rule 4г), so nothing is written to disk until the translation succeeds. Two stable
  // error codes drive the client's inline "add/fix your OpenAI key" flow: `key_missing` (no key configured
  // at all) vs `translate_failed` (a key exists but the call failed — bad key, no balance, or any other
  // OpenAI error; the owner asked for one generic message covering all of those, not a classification).
  if (!openAiKey()) {
    return NextResponse.json({ error: "key_missing" }, { status: 400 });
  }
  const translations = await translateCategoryCopy(title, description);
  if (!translations) {
    return NextResponse.json({ error: "translate_failed" }, { status: 502 });
  }
  const titleI18n: Record<string, string> = {};
  const descriptionI18n: Record<string, string> = {};
  for (const [lang, v] of Object.entries(translations)) {
    titleI18n[lang] = v.title;
    descriptionI18n[lang] = v.description;
  }

  // 1. the code: widen the union + insert the entry BEFORE "other" (which always stays last).
  const file = join(projectsRoot(), "_shared", "categories.ts");
  let src = await readFile(file, "utf8");
  if (!src.includes('| "other"') || !src.includes('slug: "other"')) {
    return NextResponse.json({ error: "categories.ts has an unexpected shape — refusing to edit it" }, { status: 500 });
  }
  src = src.replace('  | "other";', `  | "${slug}"\n  | "other";`);
  src = src.replace(
    /(\n  \{\n    slug: "other",)/,
    `\n  {\n    slug: "${slug}",\n    title: ${JSON.stringify(title)},\n    navLabel: ${JSON.stringify(title)},\n    description: ${JSON.stringify(description)},\n    titleI18n: ${JSON.stringify(titleI18n)},\n    descriptionI18n: ${JSON.stringify(descriptionI18n)},\n  },$1`,
  );
  await writeFile(file, src, "utf8");

  // 2. the route: the category hub (a thin entry over the shared CategoryHub, like every other category).
  const dir = join(projectsRoot(), slug);
  const pascal = slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
  await mkdir(join(dir, "_components"), { recursive: true });
  await writeFile(join(dir, "page.tsx"), `import ${pascal}CategoryEntry from "./_components";\n\n// Thin server entry — see app/CRUD-DOCS/workspace-standards/shell-component-architecture.md.\nexport default function Page() {\n  return <${pascal}CategoryEntry />;\n}\n`, "utf8");
  await writeFile(join(dir, "_components", "index.tsx"), `import { CategoryHub } from "../../_shared/category-hub.server";\n\nexport default function ${pascal}CategoryEntry() {\n  return <CategoryHub slug="${slug}" />;\n}\n`, "utf8");
  await writeFile(join(dir, "_meta.ts"), `import type { RouteMeta } from "@/lib/architecture/route-meta"\n\n// STANDARD ROUTE DESCRIPTOR — category hub of the Projects layer (created from the projects root, step 225).\nconst meta: RouteMeta = {\n  kind: "page",\n  path: "/projects/${slug}",\n  filePath: "app/app/(projects)/projects/${slug}/page.tsx",\n  status: "live",\n  todo: [],\n\n  visibility: "private",\n  roles: ["architect", "manager"],\n  unauthorizedRedirect: "auth-service /register?requireRole=architect",\n  enforcedBy: "component",\n\n  isDynamicRoute: false,\n  segmentParams: [],\n  pathParams: [],\n  dynamicParams: undefined,\n  prerenderedParams: undefined,\n  routeGroup: "(projects)",\n  parallelSlot: undefined,\n  parentLayout: "app/app/(projects)/layout.tsx",\n\n  rendering: "dynamic",\n  revalidate: undefined,\n  runtime: "nodejs",\n  maxDuration: undefined,\n  preferredRegion: undefined,\n  cache: undefined,\n  fetchCache: undefined,\n  revalidateTags: [],\n\n  seo: {\n    supportsSeo: false, indexable: false, inSitemap: false, canonical: null,\n    title: undefined, metaDescription: undefined, openGraph: false, ogImage: null,\n    jsonLd: [], robots: "noindex, nofollow",\n  },\n}\n\nexport default meta\n`, "utf8");
  await writeFile(join(dir, "README.md"), `# ${title}\n\n${description}\n\nProjects live here as named folders: /projects/${slug}/<project-slug>. Create them ONLY through\nPOST /api/projects/create (one entry point, never a second code path).\n`, "utf8");

  scheduleRebuild();
  return NextResponse.json({ ok: true, slug, title, building: true });
}
