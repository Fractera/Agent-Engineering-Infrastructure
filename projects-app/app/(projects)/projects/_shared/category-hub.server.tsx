import Link from "next/link";
import { getAppConfig } from "@/config/app-config";
import { defaultLanguage } from "@/lib/quiz";
import { PROJECT_CATEGORIES, categoryTitle, categoryDescription, categoryNavLabel, type ProjectCategorySlug } from "./categories";
import { listProjectSlugs } from "./projects-manifest";
import { getProjectCard } from "./project-card";
import { CreateAutomationCard } from "./components/create-automation-card.client";
import { PendingAutomations } from "./components/pending-automations.client";
import { AutomationCardTile } from "./components/automation-card-tile.client";
import { categoryHubStrings } from "./category-hub-i18n";

// Hub page of one Projects-layer category (step 207.10 item 3 redesign): an admin-style header with
// bordered/shadowed category nav buttons, then blog-style project cards (title, 2-line description, one
// line of I/O + tool badges ending +N), and the same footer the in-automation pages carry. The folder IS
// the registry (§3.12) — a project's slug is its folder name; card data comes from each project's README
// (project-card.ts). No DB read.
const MAX_BADGES = 4;

// TEN-LANGUAGE (CLAUDE.md 4г) — an ASYNC SERVER COMPONENT, so it reads the language via `defaultLanguage()`
// (server-side, synchronous, lib/quiz.ts) rather than the client-only `useUiLang()` hook — same pattern as
// projects-index.server.tsx. Category title/description/nav-label come from categories.ts's own
// titleI18n/descriptionI18n/navLabelI18n; the breadcrumb + empty state come from category-hub-i18n.ts.
export async function CategoryHub({ slug }: { slug: ProjectCategorySlug }) {
  const category = PROJECT_CATEGORIES.find((c) => c.slug === slug)!;
  const slugs = await listProjectSlugs(slug);
  const cards = await Promise.all(slugs.map((s) => getProjectCard(slug, s)));
  const cfg = getAppConfig();
  const lang = defaultLanguage();
  const L = categoryHubStrings(lang);

  return (
    <main className="mx-auto flex min-h-[70vh] w-[85vw] max-w-full flex-col px-6 py-10">
      {/* Breadcrumb back to the root index (step 217) — was plain text, no way back to /projects. */}
      <Link href="/projects" className="text-sm text-muted-foreground hover:underline">
        {L.breadcrumb}
      </Link>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{categoryTitle(category, lang)}</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">{categoryDescription(category, lang)}</p>

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
              {categoryNavLabel(c, lang)}
            </Link>
          );
        })}
      </nav>

      {/* Project cards — the big "+" card ALWAYS closes the grid (step 224 L6): it opens the creation modal
          (type → name → the mandatory instruction), the manual entry point of a new automation. */}
      <div className="mt-8 flex-1">
        {cards.length === 0 && (
          <p className="mb-4 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {L.emptyState}
          </p>
        )}
        {
          // Dynamic grid (owner): 2 cards, then 3 (xl), then 4 (2xl) on very wide screens.
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {cards.map((card) => {
              const shown = card.badges.slice(0, MAX_BADGES);
              const more = card.badges.length - shown.length;
              return (
                <AutomationCardTile
                  key={card.slug}
                  category={slug}
                  slug={card.slug}
                  href={`/projects/${slug}/${card.slug}`}
                  title={card.title}
                  description={card.description}
                  badges={shown}
                  more={more}
                />
              );
            })}
            {/* Optimistic pending cards (step 242.3): a just-created automation shows a muted spinner card
                here immediately and lights up when its page finishes building — the static grid can't show it
                until a rebuild, so this closes that gap. `existingSlugs` de-dupes once the grid catches up. */}
            <PendingAutomations category={slug} existingSlugs={cards.map((c) => c.slug)} />
            <CreateAutomationCard category={slug} />
          </div>
        }
      </div>
    </main>
  );
}
