import { PROJECT_CATEGORIES, type ProjectCategorySlug } from "./categories";
import { listProjectSlugs } from "./projects-manifest";
import { readAutomationType } from "./automation-type-reader";
import { resolveProject } from "@/lib/nodes";

// GROUP AUTOMATIONS ACROSS CATEGORIES (step 238) — a "chained" automation cuts across the closed
// ProjectCategorySlug union (it physically lives inside a real category folder, in practice always "other"
// per the creation modal's routing, but conceptually it is not "of" that category). Since there is no real
// `app/(projects)/projects/groups/` folder to list slugs from, this walks every real category the same way
// getProjectsManifest()/app/api/projects/global/route.ts already do, and filters by type.
export type GroupAutomation = { automation: string; category: ProjectCategorySlug; slug: string };

export async function listGroupAutomations(): Promise<GroupAutomation[]> {
  const out: GroupAutomation[] = [];
  for (const c of PROJECT_CATEGORIES) {
    for (const slug of await listProjectSlugs(c.slug)) {
      const automation = `${c.slug}/${slug}`;
      const proj = resolveProject(automation);
      if (!proj.ok) continue;
      const type = await readAutomationType(proj.projectDir, automation);
      if (type === "chained") out.push({ automation, category: c.slug, slug });
    }
  }
  return out;
}
