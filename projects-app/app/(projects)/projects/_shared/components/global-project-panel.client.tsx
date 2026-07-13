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
  /** step 236.1 — needed to tell a Chained GROUP apart from a plain automation, so the members section below
   *  only renders for a group. */
  type?: "stream" | "instanced" | "chained";
};

/** step 236.1 — the owner opened this panel for a Chained group expecting to see how many automations are
 *  nested INSIDE it, and instead saw the group's own (unrelated) dev-node count relabelled confusingly as
 *  "N nodes". `members` is the real, live-derived list of automations dragged into this group (computed by
 *  the caller from the canvas's own node array — parentId === this group's id — never from a polled field). */
export type GroupMember = { automation: string; slug: string };

export function GlobalProjectPanel({
  project, members, onQuiz,
}: { project: GlobalProjectSummary; members?: GroupMember[]; onQuiz: () => void }) {
  const href = `/projects/${project.category}/${project.slug}`;
  return (
    <div className="space-y-3">
      <div>
        <p className="font-medium">{project.slug}</p>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{project.category}</p>
      </div>

      {members !== undefined && (
        <div className="rounded-md border border-sky-500/40 bg-sky-500/5 p-2.5 text-xs">
          <p className="mb-1.5 font-medium text-sky-700 dark:text-sky-400">
            Automations inside this group ({members.length})
          </p>
          {members.length === 0 ? (
            <p className="text-muted-foreground">
              Empty — unlock the group (its own lock button, top-right on the canvas box) and drag an
              automation onto it.
            </p>
          ) : (
            <ul className="space-y-1">
              {members.map((m) => (
                <li key={m.automation} className="rounded border bg-background px-2 py-1 text-foreground">
                  {m.slug}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* This is the automation's OWN workflow — unrelated to group membership above (step 236.1: relabelled
          from bare "N nodes", which owners of a group were reading as a membership count). */}
      <div className="rounded-md border p-2.5 text-xs">
        {project.ready ? (
          <p className="text-emerald-600 dark:text-emerald-400">
            Built · this automation&apos;s own workflow has {project.nodes} node{project.nodes === 1 ? "" : "s"} —
            development finished, it can be linked.
          </p>
        ) : (
          <p className="text-rose-600 dark:text-rose-400">
            In development · this automation&apos;s own workflow has {project.nodes} node{project.nodes === 1 ? "" : "s"},
            {" "}{project.drafts} still to build — links can only be drawn between finished automations.
          </p>
        )}
      </div>

      {/* This project's Button primitive has no asChild — navigate on click (the same effect, one primitive). */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => { window.location.href = href; }}>
          <ExternalLink className="size-3.5" /> Open
        </Button>
        <Button size="sm" variant="outline" onClick={() => { window.location.href = `${href}#diagram`; }}>
          <Workflow className="size-3.5" /> Builder
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
