import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAppConfig } from "@/config/app-config";
import { PROJECT_CATEGORIES, type ProjectCategorySlug } from "./categories";
import { listProjectSlugs } from "./projects-manifest";
import { getProjectCard } from "./project-card";
import { ProjectsZoneFooter } from "@/app/(projects)/_components/projects-zone-footer.client";

// Hub page of one Projects-layer category (step 207.10 item 3 redesign): an admin-style header with
// bordered/shadowed category nav buttons, then blog-style project cards (title, 2-line description, one
// line of I/O + tool badges ending +N), and the same footer the in-automation pages carry. The folder IS
// the registry (§3.12) — a project's slug is its folder name; card data comes from each project's README
// (project-card.ts). No DB read.
const MAX_BADGES = 4;

export async function CategoryHub({ slug }: { slug: ProjectCategorySlug }) {
  const category = PROJECT_CATEGORIES.find((c) => c.slug === slug)!;
  const slugs = await listProjectSlugs(slug);
  const cards = await Promise.all(slugs.map((s) => getProjectCard(slug, s)));
  const cfg = getAppConfig();

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-4xl flex-col px-6 py-10">
      <p className="text-sm text-muted-foreground">Projects</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{category.title}</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">{category.description}</p>

      {/* Category nav — admin-style bordered/shadowed buttons; the current category is highlighted. */}
      <nav className="mt-6 flex flex-wrap gap-2">
        {PROJECT_CATEGORIES.map((c) => {
          const active = c.slug === slug;
          return (
            <Link
              key={c.slug}
              href={`/projects/${c.slug}`}
              aria-current={active ? "page" : undefined}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted hover:text-foreground"
              }`}
            >
              {c.navLabel}
            </Link>
          );
        })}
      </nav>

      {/* Project cards */}
      <div className="mt-8 flex-1">
        {cards.length === 0 ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No projects here yet. A project is created as a named folder
            /projects/{category.slug}/&lt;project-slug&gt; by the agent pipeline.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map((card) => {
              const shown = card.badges.slice(0, MAX_BADGES);
              const more = card.badges.length - shown.length;
              return (
                <Link
                  key={card.slug}
                  href={`/projects/${slug}/${card.slug}`}
                  className="group flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight">{card.title}</h3>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>
                  {card.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{card.description}</p>
                  )}
                  {(shown.length > 0 || more > 0) && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {shown.map((b) => (
                        <span key={b} className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground">
                          {b}
                        </span>
                      ))}
                      {more > 0 && (
                        <span className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground">+{more}</span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <ProjectsZoneFooter shortName={cfg.short_name} />
    </main>
  );
}
