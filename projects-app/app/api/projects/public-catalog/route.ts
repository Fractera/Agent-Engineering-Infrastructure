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

// Per-automation access for the public BODY gate. The automation declares `passport.access` in its
// _data/automation.json (owner's decision, steps 304/309):
//   • step 309 form — an ARRAY of ROLES (e.g. ["subscriber_standard"]); EMPTY array = fully public.
//   • legacy step 304 form — a single tier STRING (guest|user|architect).
// Anything absent/unknown (every v1 automation, every automation before this) is fully public. The catalog
// never HIDES the automation — the hero is always public; only the body is gated on 3000.
// Returns both `access` (a coarse tier, kept for the old public app) and `accessRoles` (the full role list,
// the source of truth for the body gate): a visitor sees the real body if the role list is empty OR they
// hold one of the listed roles.
async function readAccess(category: string, slug: string): Promise<{ access: AccessTier; accessRoles: string[] }> {
  try {
    const raw = await readFile(join(projectsRoot(), category, slug, "_data", "automation.json"), "utf8");
    const core = JSON.parse(raw) as { passport?: { access?: unknown } };
    const a = core?.passport?.access;
    if (Array.isArray(a)) {
      const roles = a.map(String).filter(Boolean);
      // Coarse tier for the legacy field: empty = public (guest); role-gated → "user" (non-public marker).
      return { access: roles.length ? "user" : "guest", accessRoles: roles };
    }
    if (typeof a === "string" && (ACCESS_TIERS as readonly string[]).includes(a)) {
      return { access: a as AccessTier, accessRoles: a === "guest" ? [] : [a] };
    }
  } catch {
    /* not a v2 automation, or no access declared — public by default */
  }
  return { access: "guest", accessRoles: [] };
}

type AutomationEntry = { slug: string; title: string; description: string; access: AccessTier; accessRoles: string[] };

async function automationEntry(category: string, slug: string): Promise<AutomationEntry> {
  const [card, acc] = await Promise.all([getProjectCard(category as never, slug), readAccess(category, slug)]);
  return { slug, title: card.title, description: card.description, access: acc.access, accessRoles: acc.accessRoles };
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
