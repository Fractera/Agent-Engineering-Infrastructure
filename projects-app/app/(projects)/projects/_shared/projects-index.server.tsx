import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAppConfig } from "@/config/app-config";
import { defaultLanguage } from "@/lib/quiz";
import { PROJECT_CATEGORIES, categoryTitle, categoryDescription } from "./categories";
import { listProjectSlugs } from "./projects-manifest";
import { getProjectCard } from "./project-card";
import { GlobalCanvas } from "./components/global-canvas.client";
import { CreateAutomationRootCard } from "./components/create-automation-card.client";
import { projectsIndexStrings } from "./projects-index-i18n";

// Root index of the Projects layer (/projects, step 211 Ф0): the landing that
// lists the four permanent categories with their live project counts and names.
// Before this page the bare /projects URL was a 404 — only the category hubs
// existed. Same data sources as the hubs: the folder IS the registry
// (projects-manifest), card titles come from each project's README. No DB read.
//
// TEN-LANGUAGE (step 234.2, CLAUDE.md 4г) — this is an ASYNC SERVER COMPONENT, so it reads the language via
// `defaultLanguage()` (server-side, synchronous, lib/quiz.ts) rather than the client-only `useUiLang()` hook.
// Category title/description come from categories.ts's own titleI18n/descriptionI18n (hand-authored for the
// 4 built-ins, LLM-translated for owner-created ones); project-name badges stay untranslated (live data).
export async function ProjectsIndex() {
  const cfg = getAppConfig();
  const lang = defaultLanguage();
  const L = projectsIndexStrings(lang);
  const categories = await Promise.all(
    PROJECT_CATEGORIES.map(async (c) => {
      const slugs = await listProjectSlugs(c.slug);
      const cards = await Promise.all(slugs.map((s) => getProjectCard(c.slug, s)));
      return { ...c, cards };
    }),
  );

  return (
    <>
    <main className="mx-auto flex w-[85vw] max-w-full flex-col px-6 py-10">
      <p className="text-sm text-muted-foreground">{L.breadcrumb}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{L.title}</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        {L.description}
      </p>

      {/* Dynamic grid (owner): 2 cards, then 3, then 4 on very wide screens. */}
      <div className="mt-8 grid flex-1 content-start gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/projects/${c.slug}`}
            className="group flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-tight">{categoryTitle(c, lang)}</h3>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{categoryDescription(c, lang)}</p>
            {/* step 236.5 (owner) — max ONE line: left = project-name badges (first shown in full, the LAST
                shown one fills remaining space and truncates with an ellipsis if too long), right = a
                fixed "+N" badge for however many didn't fit. Replaces the old flex-wrap row (could grow to
                several lines) and the old "{n} projects" count badge (now folded into the overflow count). */}
            {c.cards.length > 0 && (
              <div className="mt-3 flex items-center gap-1.5">
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  {c.cards.slice(0, 2).map((card, i, shown) => (
                    <span
                      key={card.slug}
                      className={`rounded border px-1.5 py-0.5 text-xs text-muted-foreground ${
                        i === shown.length - 1 ? "min-w-0 flex-1 truncate" : "shrink-0"
                      }`}
                    >
                      {card.title}
                    </span>
                  ))}
                </div>
                {c.cards.length > 2 && (
                  <span className="shrink-0 rounded border px-1.5 py-0.5 text-xs text-muted-foreground">
                    +{c.cards.length - 2}
                  </span>
                )}
              </div>
            )}
          </Link>
        ))}
        {/* The root's own "create project" card (step 225 G6) — the SAME creation dialog as a category's "+",
            with the one option a category grid cannot offer: choosing WHICH category the automation lives in. */}
        <CreateAutomationRootCard />
      </div>

    </main>

    {/* THE GLOBAL AUTOMATION CANVAS (step 225) — below the cards, at the root: every project is a node, every
        link a programmable integration between two automations. It sits OUTSIDE the centered max-w-4xl column
        (which was clamping it): the canvas is 85vw × 75vh, so it needs the full page width to expand into. */}
    <section className="mx-auto w-[85vw] max-w-full px-6 pb-10">
      <GlobalCanvas />
    </section>
    </>
  );
}
