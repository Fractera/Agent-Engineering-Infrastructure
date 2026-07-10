import { readdir } from "fs/promises";
import { join } from "path";
import { PROJECT_CATEGORIES, type ProjectCategorySlug } from "./categories";

// Build-time manifest of the Projects layer for the account drawer (step 177).
// The folder IS the registry (§3.12): a project's slug is its folder name under
// app/(projects)/projects/<category>/; "_"-folders are private co-located data.
// Server-only (fs read) — client components may take ProjectsManifest via
// `import type` ONLY, never a value import (step 176: a value import of a
// server file breaks the build).
export type ProjectsManifestCategory = {
  slug: ProjectCategorySlug;
  title: string;
  projects: string[]; // project slugs (folder names), sorted
};

export type ProjectsManifest = ProjectsManifestCategory[];

export async function listProjectSlugs(
  category: ProjectCategorySlug,
): Promise<string[]> {
  try {
    const dir = join(process.cwd(), "app", "(projects)", "projects", category);
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

// All four permanent categories, always present even when empty — the drawer's
// nested accordion shows every category regardless of project count.
export async function getProjectsManifest(): Promise<ProjectsManifest> {
  return Promise.all(
    PROJECT_CATEGORIES.map(async (c) => ({
      slug: c.slug,
      title: c.title,
      projects: await listProjectSlugs(c.slug),
    })),
  );
}
