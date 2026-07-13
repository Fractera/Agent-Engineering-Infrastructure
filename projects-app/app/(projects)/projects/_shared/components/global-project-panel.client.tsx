"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, ListChecks, Loader2, MessagesSquare, Rocket, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInput } from "./voice-input.client";
import { UseCasesPanel } from "./use-cases-panel.client";
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
// workflow — it has NO Builder (there is nothing of its own to build) and no "Open" link. Instead the owner
// writes ONE free-text brief (mic included, same VoiceInput primitive as everywhere else) describing how the
// automations dragged inside it should hand off to each other, and "Start development" materializes that
// brief as a numbered step — same shape GlobalEdgePanel already has for a link. Its Quiz button DOES reappear
// (step 236.5) — not to design nodes (a group has none), but because a group is still a real automation
// underneath and needs the same use-cases gate ("copy the logic", owner) every other automation's own
// "Start development" already has — the Quiz button is that gate's front door, shown only while unreviewed.
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

  // ─── the chain brief (group only, step 236.3) ───
  const [chainSpec, setChainSpec] = useState("");
  const [busy, setBusy] = useState(false);
  const briefRef = useRef<HTMLTextAreaElement | null>(null);
  // THE USE-CASES GATE (step 236.5, owner: "copy the logic" — every OTHER automation's "Start development"
  // already refuses until the Quiz's use cases are described + confirmed; a chained group is still a real
  // automation underneath, so it gets the exact same requirement). `null` = not checked yet (no banner while
  // loading, avoids a flash); `false` = show the "Complete the Quiz" prompt.
  const [reviewed, setReviewed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isGroup) return;
    void (async () => {
      const r = await fetch(`/api/projects/chain-spec?automation=${encodeURIComponent(project.automation)}`, { cache: "no-store" });
      if (r.ok) setChainSpec(((await r.json()) as { spec?: string }).spec ?? "");
      const u = await fetch(`/api/projects/use-cases?automation=${encodeURIComponent(project.automation)}`, { cache: "no-store" });
      if (u.ok) setReviewed(((await u.json()) as { review?: { reviewed?: boolean } }).review?.reviewed ?? false);
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
      const d = (await r.json()) as { number?: number; message?: string; error?: string; reason?: string };
      if (r.status === 409 && (d.reason === "no-cases" || d.reason === "not-reviewed")) {
        setReviewed(false); // re-surface the banner even if the initial fetch was stale
        toast.error(d.reason === "no-cases" ? L.errGroupNoCases : L.errGroupNotReviewed);
        return;
      }
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
        // GROUP — no Builder (a container has no workflow of its own): a free-text chain brief + mic +
        // Start development, the same materialize-a-step shape GlobalEdgePanel already has. Its OWN Quiz
        // button reappears here (step 236.5) — not to design nodes (a group has none), but because a group
        // is still a real automation underneath and needs the SAME use-cases gate every other automation's
        // "Start development" already has (assertUseCasesReviewed) — this banner is that gate's front door.
        <div className="space-y-3">
          {reviewed === false && (
            <div className="space-y-2 rounded-md border border-amber-500/50 bg-amber-500/5 p-2.5">
              <p className="text-xs text-muted-foreground">{L.groupQuizNeededBanner}</p>
              <Button size="sm" variant="outline" onClick={onQuiz} className="w-full">
                <ListChecks className="size-3.5" /> {L.groupQuizBtn}
              </Button>
            </div>
          )}
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

      {/* step 236.6 (owner) — same Use cases interface as every automation's own page, right here on the
          global canvas panel, so opening a node never means "go find the cases somewhere else." */}
      <div className="space-y-2 border-t pt-3">
        <p className="text-xs font-medium text-muted-foreground">{UC.sectionTitle}</p>
        <UseCasesPanel cases={[]} automation={project.automation} />
      </div>
    </div>
  );
}
