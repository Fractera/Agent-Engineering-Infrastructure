import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAppConfig } from "@/config/app-config";
import { PROJECT_CATEGORIES } from "./categories";
import { listProjectSlugs } from "./projects-manifest";
import { getProjectCard } from "./project-card";
import { GlobalCanvas } from "./components/global-canvas.client";
import { CreateAutomationRootCard } from "./components/create-automation-card.client";

// Root index of the Projects layer (/projects, step 211 Ф0): the landing that
// lists the four permanent categories with their live project counts and names.
// Before this page the bare /projects URL was a 404 — only the category hubs
// existed. Same data sources as the hubs: the folder IS the registry
// (projects-manifest), card titles come from each project's README. No DB read.
export async function ProjectsIndex() {
  const cfg = getAppConfig();
  const categories = await Promise.all(
    PROJECT_CATEGORIES.map(async (c) => {
      const slugs = await listProjectSlugs(c.slug);
      const cards = await Promise.all(slugs.map((s) => getProjectCard(c.slug, s)));
      return { ...c, cards };
    }),
  );

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-4xl flex-col px-6 py-10">
      <p className="text-sm text-muted-foreground">Projects</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">All categories</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Independent lines of work this workspace runs — each project is a small
        finished application with its own pages, data and workflow. Four permanent
        categories; a project is a named folder inside one of them.
      </p>

      <div className="mt-8 grid flex-1 content-start gap-4 sm:grid-cols-2">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/projects/${c.slug}`}
            className="group flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-tight">{c.title}</h3>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground">
                {c.cards.length} project{c.cards.length === 1 ? "" : "s"}
              </span>
              {c.cards.slice(0, 3).map((card) => (
                <span key={card.slug} className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground">
                  {card.title}
                </span>
              ))}
            </div>
          </Link>
        ))}
        {/* The root's own "create project" card (step 225 G6) — the SAME creation dialog as a category's "+",
            with the one option a category grid cannot offer: choosing WHICH category the automation lives in. */}
        <CreateAutomationRootCard />
      </div>

      {/* THE GLOBAL AUTOMATION CANVAS (step 225) — below the cards, at the root: every project is a node,
          every link a programmable integration between two automations. This is the "automated global
          architecture" — how projects depend on each other's actions. */}
      <GlobalCanvas />
    </main>
  );
}
