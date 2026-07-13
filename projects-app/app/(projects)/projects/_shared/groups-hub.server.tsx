import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { defaultLanguage } from "@/lib/quiz";
import { listGroupAutomations } from "./groups-manifest";
import { getProjectCard } from "./project-card";
import { projectsIndexStrings } from "./projects-index-i18n";

// GROUP AUTOMATIONS HUB (step 238) — the destination of the root index's "Group automations" card. Modeled
// directly on category-hub.server.tsx's card grid (breadcrumb back to /projects, title + description, one
// card per automation via the SAME getProjectCard() every category hub already uses), but lists group
// (chained-type) automations across ALL real categories instead of one category's folder — a "chained"
// automation cuts across the closed ProjectCategorySlug union (see groups-manifest.ts).
//
// NO CREATION ENTRY POINT HERE (deliberate, matches an existing constraint): chained-type creation is
// canvas-only (create-automation-card.client.tsx's own design comment — "only the root/global-canvas '+'
// does"). This page stays read/navigate-only.
export async function GroupsHub() {
  const lang = defaultLanguage();
  const L = projectsIndexStrings(lang);
  const groups = await listGroupAutomations();
  const cards = await Promise.all(groups.map((g) => getProjectCard(g.category, g.slug).then((card) => ({ ...card, category: g.category }))));

  return (
    <main className="mx-auto flex min-h-[70vh] w-[85vw] max-w-full flex-col px-6 py-10">
      <Link href="/projects" className="text-sm text-muted-foreground hover:underline">
        ← {L.breadcrumb}
      </Link>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{L.groupAutomationsTitle}</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">{L.groupAutomationsDescription}</p>

      <div className="mt-8 flex-1">
        {cards.length === 0 && (
          <p className="mb-4 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {L.groupAutomationsEmpty}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {cards.map((card) => (
            <Link
              key={`${card.category}/${card.slug}`}
              href={`/projects/${card.category}/${card.slug}`}
              className="group flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-tight">{card.title}</h3>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>
              {card.description && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{card.description}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
