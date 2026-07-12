"use client";

import { ExternalLink, MessagesSquare, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";

// THE PROJECT PANEL of the global canvas (step 225 G4). Clicking a project node opens it: what the
// automation IS (category, how many nodes, how many are still drafts, whether it is out of development) and
// the three things the owner can do WITHOUT leaving the canvas:
//   • Open    — the automation's page,
//   • Quiz    — the SAME activation Quiz the page opens on a first visit (it resumes an unfinished session),
//   • Builder — the page's diagram, where nodes are authored and handed to the coding agent.
// The Quiz opens in place (the canvas owns the modal) — the owner designs from the global view.
export type GlobalProjectSummary = {
  automation: string; category: string; slug: string; ready: boolean; nodes: number; drafts: number;
};

export function GlobalProjectPanel({
  project, onQuiz,
}: { project: GlobalProjectSummary; onQuiz: () => void }) {
  const href = `/projects/${project.category}/${project.slug}`;
  return (
    <div className="space-y-3">
      <div>
        <p className="font-medium">{project.slug}</p>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{project.category}</p>
      </div>

      <div className="rounded-md border p-2.5 text-xs">
        {project.ready ? (
          <p className="text-emerald-600 dark:text-emerald-400">
            Built · {project.nodes} node{project.nodes === 1 ? "" : "s"} — development finished, it can be linked.
          </p>
        ) : (
          <p className="text-rose-600 dark:text-rose-400">
            In development · {project.nodes} node{project.nodes === 1 ? "" : "s"}, {project.drafts} still to build
            — links can only be drawn between finished automations.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <a href={href}>
            <ExternalLink className="size-3.5" /> Open
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href={`${href}#diagram`}>
            <Workflow className="size-3.5" /> Builder
          </a>
        </Button>
      </div>

      <Button size="sm" variant="secondary" onClick={onQuiz} className="w-full">
        <MessagesSquare className="size-3.5" /> Quiz — design its nodes
      </Button>
      <p className="text-xs text-muted-foreground">
        The Quiz brainstorms this automation into nodes: each finished node becomes a draft on its diagram and
        one development step for the coding agent. An unfinished session resumes where it stopped.
      </p>
    </div>
  );
}
