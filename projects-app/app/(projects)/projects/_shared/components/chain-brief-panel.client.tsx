"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ListChecks, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInput } from "./voice-input.client";
import { ActivationQuiz } from "./activation-quiz.client";
import { useUiLang } from "../use-ui-lang";
import { globalCanvasStrings } from "../global-canvas-i18n";
import { fill } from "../quiz-i18n";

// THE CHAIN BRIEF EDITOR (step 236.3, extracted to its own self-contained component step 238) — a Chained
// group is a CANVAS-ONLY container, not a workflow: it has no Builder (nothing of its own to build). Instead
// the owner writes ONE free-text brief (mic included, same VoiceInput primitive as everywhere else)
// describing how the automations inside the group should hand off to each other, and "Start development"
// materializes that brief as a numbered step — same shape GlobalEdgePanel already has for a link.
//
// THE USE-CASES GATE (step 236.5, owner: "copy the logic" — every OTHER automation's "Start development"
// already refuses until the Quiz's use cases are described + confirmed; a chained group is still a real
// automation underneath, so it gets the exact same requirement). The amber banner is that gate's front door,
// shown only while unreviewed.
//
// SELF-CONTAINED (step 238): owns its own Quiz dialog internally — mirrors UseCasesPanel's own pattern
// (`editing` state + an inline <ActivationQuiz .../>) — so this component needs only `{automation}` and can
// be mounted from BOTH the root canvas's side panel (global-project-panel.client.tsx) AND the group's own
// dedicated page (group-detail-section.client.tsx) without any caller having to wire a Quiz open/close
// callback of its own.
export function ChainBriefPanel({ automation }: { automation: string }) {
  const L = globalCanvasStrings(useUiLang());
  const [chainSpec, setChainSpec] = useState("");
  const [busy, setBusy] = useState(false);
  const briefRef = useRef<HTMLTextAreaElement | null>(null);
  // `null` = not checked yet (no banner while loading, avoids a flash); `false` = show the "Complete the
  // Quiz" prompt.
  const [reviewed, setReviewed] = useState<boolean | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/projects/chain-spec?automation=${encodeURIComponent(automation)}`, { cache: "no-store" });
    if (r.ok) setChainSpec(((await r.json()) as { spec?: string }).spec ?? "");
    const u = await fetch(`/api/projects/use-cases?automation=${encodeURIComponent(automation)}`, { cache: "no-store" });
    if (u.ok) setReviewed(((await u.json()) as { review?: { reviewed?: boolean } }).review?.reviewed ?? false);
  }, [automation]);

  useEffect(() => { void load(); }, [load]);

  // STEP 240 — the chain brief no longer dispatches its own development step. Saving STAGES it (a non-empty
  // chain-spec.md is this group's pending task), and the group page's wave banner hands the whole batch —
  // the chain brief plus anything else staged — to a coding agent in ONE step. Opened from the global canvas
  // there is no banner in view: the brief is still saved/staged, and the launch happens on the group's page.
  const saveChainBrief = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/chain-spec`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation, spec: chainSpec }),
      });
      if (!r.ok) { toast.error(L.chainStepFailed); return; }
      toast.success(L.chainBriefSaved);
    } finally { setBusy(false); }
  }, [automation, chainSpec, L]);

  return (
    <div className="space-y-3">
      {reviewed === false && (
        <div className="space-y-2 rounded-md border border-amber-500/50 bg-amber-500/5 p-2.5">
          <p className="text-xs text-muted-foreground">{L.groupQuizNeededBanner}</p>
          <Button size="sm" variant="outline" onClick={() => setQuizOpen(true)} className="w-full">
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
        <Button size="sm" variant="outline" onClick={saveChainBrief} disabled={busy} className="w-full">
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} {L.chainBriefSave}
        </Button>
      </div>

      {quizOpen && (
        <ActivationQuiz
          automation={automation}
          open
          onClose={() => { setQuizOpen(false); void load(); }}
        />
      )}
    </div>
  );
}
