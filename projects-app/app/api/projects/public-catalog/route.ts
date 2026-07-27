import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { projectsRoot } from "@/lib/nodes";
import { PROJECT_CATEGORIES } from "@/app/(projects)/projects/_shared/categories";
import { listProjectSlugs } from "@/app/(projects)/projects/_shared/projects-manifest";
import { getProjectCard } from "@/app/(projects)/projects/_shared/project-card";

// PUBLIC READ-ONLY CATALOG (step 304) — the single data source the public app surface (port 3000 / the FNS
// slot) reads to mirror the Projects layer WITHOUT any cockpit. This layer (3003) is the private architect
// pult; the public app has no filesystem access to these folders (a separate Next app), so it fetches this
// catalog over HTTP at request time.
//
// DELIBERATELY UNAUTHENTICATED: it exposes ONLY the public-safe shape — category chrome (localized
// title/description) and each automation's HERO (title + description) plus its access TIER. It never returns
// body data, cron state, records, keys, or anything cockpit. The proxy's page-gate excludes /api/ (matcher
// `(?!…|api/)`), so this route is reachable anonymously without any proxy change, and it does NOT call
// authorize() — the whole point is a public read.
//
// The FOLDER IS THE REGISTRY (§3.12): categories come from PROJECT_CATEGORIES, automation slugs from the
// folder scan (listProjectSlugs), the hero from each automation's own card (getProjectCard — v2 passport or
// v1 README). No DB read. No duplication of the enumeration logic.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCESS_TIERS = ["guest", "user", "architect"] as const;
type AccessTier = (typeof ACCESS_TIERS)[number];

// Per-automation access tier for the public BODY gate. Reused auth-layer vocabulary (owner's decision, step
// 304): the automation may declare `passport.access` in its _data/automation.json; anything absent/unknown
// (every v1 automation, every automation created before this step) defaults to the fully-public tier `guest`.
// This never hides the automation from the catalog — the hero is always public; only the body is gated on 3000.
async function readAccess(category: string, slug: string): Promise<AccessTier> {
  try {
    const raw = await readFile(join(projectsRoot(), category, slug, "_data", "automation.json"), "utf8");
    const core = JSON.parse(raw) as { passport?: { access?: string } };
    const a = core?.passport?.access;
    if (a && (ACCESS_TIERS as readonly string[]).includes(a)) return a as AccessTier;
  } catch {
    /* not a v2 automation, or no access declared — public by default */
  }
  return "guest";
}

type AutomationEntry = { slug: string; title: string; description: string; access: AccessTier };

async function automationEntry(category: string, slug: string): Promise<AutomationEntry> {
  const [card, access] = await Promise.all([getProjectCard(category as never, slug), readAccess(category, slug)]);
  return { slug, title: card.title, description: card.description, access };
}

async function categoryEntry(c: (typeof PROJECT_CATEGORIES)[number]) {
  const slugs = await listProjectSlugs(c.slug);
  const automations = await Promise.all(slugs.map((s) => automationEntry(c.slug, s)));
  return {
    slug: c.slug,
    titleI18n: c.titleI18n ?? { en: c.title },
    descriptionI18n: c.descriptionI18n ?? { en: c.description },
    automations,
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const automation = url.searchParams.get("automation");

  // One automation's hero + access tier.
  if (category && automation) {
    const cat = PROJECT_CATEGORIES.find((c) => c.slug === category);
    if (!cat) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const slugs = await listProjectSlugs(cat.slug);
    if (!slugs.includes(automation)) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const entry = await automationEntry(cat.slug, automation);
    return NextResponse.json({ category: cat.slug, ...entry });
  }

  // One category with its automation cards.
  if (category) {
    const cat = PROJECT_CATEGORIES.find((c) => c.slug === category);
    if (!cat) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ category: await categoryEntry(cat) });
  }

  // Full tree: every category + its automations.
  const categories = await Promise.all(PROJECT_CATEGORIES.map(categoryEntry));
  return NextResponse.json({ categories });
}
