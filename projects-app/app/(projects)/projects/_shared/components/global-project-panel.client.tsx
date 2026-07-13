"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, MessagesSquare, Rocket, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInput } from "./voice-input.client";
import { useUiLang } from "../use-ui-lang";
import { globalCanvasStrings } from "../global-canvas-i18n";
import { fill } from "../quiz-i18n";

// THE PROJECT PANEL of the global canvas (step 225 G4). Clicking a project node opens it.
//
// PLAIN AUTOMATION: what it IS (category, its own workflow's node/draft count, whether it is out of
// development) and three things the owner can do WITHOUT leaving the canvas — Open / Builder / Quiz.
//
// A "CHAINED" GROUP (step 236.3, `members !== undefined`): a group is a CANVAS-ONLY container, not a
// workflow — it has NO Builder (there is nothing of its own to build) and no Open/Quiz either. Instead the
// owner writes ONE free-text brief (mic included, same VoiceInput primitive as everywhere else) describing
// how the automations dragged inside it should hand off to each other, and "Start development" materializes
// that brief as a numbered step — same shape GlobalEdgePanel already has for a link.
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
  const L = globalCanvasStrings(useUiLang());
  const href = `/projects/${project.category}/${project.slug}`;
  const isGroup = members !== undefined;

  // ─── the chain brief (group only, step 236.3) ───
  const [chainSpec, setChainSpec] = useState("");
  const [busy, setBusy] = useState(false);
  const briefRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isGroup) return;
    void (async () => {
      const r = await fetch(`/api/projects/chain-spec?automation=${encodeURIComponent(project.automation)}`, { cache: "no-store" });
      if (r.ok) setChainSpec(((await r.json()) as { spec?: string }).spec ?? "");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.automation, isGroup]);

  const startChainDevelopment = useCallback(async () => {
    setBusy(true);
    try {
      await fetch(`/api/projects/chain-spec`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation: project.automation, spec: chainSpec }),
      });
      const r = await fetch(`/api/projects/chain-spec/start-development`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation: project.automation }),
      });
      const d = (await r.json()) as { number?: number; message?: string; error?: string };
      if (!r.ok) { toast.error(d.error ?? L.chainStepFailed); return; }
      toast.success(fill(L.stepCreatedToast, { step: d.number ?? "" }), {
        description: L.stepCopyDesc,
        duration: 30000,
        action: { label: L.copyBtn, onClick: () => void navigator.clipboard.writeText(d.message ?? "") },
      });
    } finally { setBusy(false); }
  }, [project.automation, chainSpec, L]);

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
        // GROUP — no Builder (a container has no workflow of its own), no Open/Quiz: a free-text chain
        // brief + mic + Start development, the same materialize-a-step shape GlobalEdgePanel already has.
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{L.chainBriefLabel}</label>
          <Textarea
            ref={briefRef}
            value={chainSpec}
            onChange={(e) => setChainSpec(e.target.value)}
            rows={6}
            placeholder={L.chainBriefPlaceholder}
          />
          <VoiceInput targetRef={briefRef} value={chainSpec} onChange={setChainSpec} className="mt-1" />
          <Button size="sm" variant="secondary" onClick={startChainDevelopment} disabled={busy} className="w-full">
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Rocket className="size-3.5" />} {L.btnStartDevelopment}
          </Button>
        </div>
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
    </div>
  );
}
