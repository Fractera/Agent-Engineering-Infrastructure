"use client";

import { ExternalLink, MessagesSquare, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UseCasesPanel } from "./use-cases-panel.client";
import { ChainBriefPanel } from "./chain-brief-panel.client";
import { useUiLang } from "../use-ui-lang";
import { globalCanvasStrings } from "../global-canvas-i18n";
import { useCasesStrings } from "../use-cases-i18n";
import { fill } from "../quiz-i18n";

// THE PROJECT PANEL of the global canvas (step 225 G4). Clicking a project node opens it.
//
// PLAIN AUTOMATION: what it IS (category, its own workflow's node/draft count, whether it is out of
// development) and three things the owner can do WITHOUT leaving the canvas — Open / Builder / Quiz.
//
// A "CHAINED" GROUP (step 236.3, `members !== undefined`): a group is a CANVAS-ONLY container, not a
// workflow — it has NO Builder (there is nothing of its own to build) and no "Open" link. Instead the
// self-contained ChainBriefPanel (step 238, extracted from this file) carries the free-text chain brief +
// mic + "Start development" + its own use-cases-gate Quiz banner — reused unchanged on the group's own
// dedicated page (group-detail-section.client.tsx).
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
  const lang = useUiLang();
  const L = globalCanvasStrings(lang);
  const UC = useCasesStrings(lang);
  const href = `/projects/${project.category}/${project.slug}`;
  const isGroup = members !== undefined;

  return (
    <div className="space-y-3">
      <div>
        <p className="font-medium">{project.slug}</p>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{project.category}</p>
      </div>

      {isGroup && (
        <div className="rounded-md border border-sky-500/40 bg-sky-500/5 p-2.5 text-xs">
          <p className="mb-1.5 font-medium text-sky-700 dark:text-sky-400">
            {fill(L.groupMembersHeader, { n: members.length })}
          </p>
          {members.length === 0 ? (
            <p className="text-muted-foreground">{L.groupMembersEmpty}</p>
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
            {fill(L.ownWorkflowBuilt, { n: project.nodes })}
          </p>
        ) : (
          <p className="text-rose-600 dark:text-rose-400">
            {fill(L.ownWorkflowDraft, { n: project.nodes, d: project.drafts })}
          </p>
        )}
      </div>

      {isGroup ? (
        // GROUP — no Builder (a container has no workflow of its own): the self-contained ChainBriefPanel
        // (step 238) carries the free-text chain brief + mic + Start development + its own use-cases-gate
        // Quiz banner. `onQuiz` (the plain-automation Quiz callback below) is unused here — the panel opens
        // its own Quiz internally.
        <ChainBriefPanel automation={project.automation} />
      ) : (
        <>
          {/* This project's Button primitive has no asChild — navigate on click (the same effect, one primitive). */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => { window.location.href = href; }}>
              <ExternalLink className="size-3.5" /> {L.btnOpen}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { window.location.href = `${href}#diagram`; }}>
              <Workflow className="size-3.5" /> {L.btnBuilder}
            </Button>
          </div>

          <Button size="sm" variant="secondary" onClick={onQuiz} className="w-full">
            <MessagesSquare className="size-3.5" /> {L.btnQuiz}
          </Button>
          <p className="text-xs text-muted-foreground">
            {L.quizBlurb}
          </p>
        </>
      )}

      {/* step 236.6 (owner) — same Use cases interface as every automation's own page, right here on the
          global canvas panel, so opening a node never means "go find the cases somewhere else." */}
      <div className="space-y-2 border-t pt-3">
        <p className="text-xs font-medium text-muted-foreground">{UC.sectionTitle}</p>
        <UseCasesPanel cases={[]} automation={project.automation} />
      </div>
    </div>
  );
}
