"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUiLang } from "../use-ui-lang";
import { automationMenuStrings } from "../automation-menu-i18n";
import { fill } from "../quiz-i18n";
import { VoiceInput } from "./voice-input.client";
import { ActivationQuiz } from "./activation-quiz.client";
import type { EntityType } from "@/lib/entity-store";

// THE REQUIREMENT BRIEF PANEL (step 238 P5-P9; "Start development" added Phase 2) — the authoring surface
// for the five entities that had NONE until now (Dashboard/Analytics/Calendar/Map/Processes): a free-text
// field for "the next thing I need here", same shape as the chain brief. "Save" is a plain DRAFT overwrite
// (<entity>-architecture/add-new-transport-task-entry) — nothing is archived yet, the owner may still be
// editing. "Start development" (<entity>-architecture/start-development) is the REAL "handed to a coding
// agent" event: it materializes a Development Step from the CURRENT brief, then archives it into history and
// clears the container — mirroring ChainBriefPanel's own Start-development button exactly (same use-cases
// gate, same step-created toast with a copy action). One component, reused for all five — they are
// structurally identical (a single free-text transport field, automation-scoped, ref='').
//
// STEP 239 — the panel became a real DESIGN surface: the shared VoiceInput primitive (232) sits under the
// field, and "Add with AI" opens the SAME Quiz on this entity as its subject, writing the wording it produces
// straight back into the field (the owner still reviews and saves). `entityLabel` is passed IN rather than
// looked up here, because the caller (the accordion) already has the translated label and because the new
// fork-activation entity is not a key of the menu's `entities` record.
export function RequirementBriefPanel({
  entityType,
  entityLabel,
  automation,
}: {
  entityType: EntityType;
  /** The entity's translated name — shown as the Quiz's subtitle. Falls back to the raw type. */
  entityLabel?: string;
  automation?: string;
}) {
  const L = automationMenuStrings(useUiLang());
  const [brief, setBrief] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  // "Add with AI" (step 239) — opens the SAME Quiz, on the `entity` subject. Controlled: this panel owns the
  // open state, and the closing move hands the requirement text straight back into the textarea below.
  const [quizOpen, setQuizOpen] = useState(false);
  // Caret target for the shared VoiceInput primitive (step 232) — spoken text lands where the cursor is.
  const briefRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!automation) return;
    let alive = true;
    setLoading(true);
    fetch(`/api/projects/${entityType}-architecture/extract-current-state-for-architecture?automation=${encodeURIComponent(automation)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { instances?: { currentTask?: { brief?: string } | null; pending?: boolean }[] } | null) => {
        if (!alive) return;
        // These 5 entities are always automation-wide — exactly one instance (ref=''), never zero/many.
        const inst = d?.instances?.[0];
        setBrief(inst?.currentTask?.brief ?? "");
        setPending(Boolean(inst?.pending));
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [automation, entityType]);

  async function save() {
    if (!automation) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/projects/${entityType}-architecture/add-new-transport-task-entry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation, ref: "", payload: { brief } }),
      });
      if (!r.ok) throw new Error(String(r.status));
      setPending(brief.trim().length > 0);
      toast.success(L.requirementSaved);
    } catch {
      toast.error(L.requirementSaveFail);
    } finally {
      setSaving(false);
    }
  }

  async function startDevelopment() {
    if (!automation) return;
    setStarting(true);
    try {
      // Save whatever is currently in the textarea first, so "Start development" always hands over the
      // LATEST text even if the owner never clicked "Save" — mirrors ChainBriefPanel's own button.
      await fetch(`/api/projects/${entityType}-architecture/add-new-transport-task-entry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation, ref: "", payload: { brief } }),
      });
      const r = await fetch(`/api/projects/${entityType}-architecture/start-development`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation }),
      });
      const d = (await r.json().catch(() => null)) as { number?: number; message?: string; reason?: string } | null;
      if (r.status === 409 && (d?.reason === "no-cases" || d?.reason === "not-reviewed")) {
        toast.error(d.reason === "no-cases" ? L.requirementNoCases : L.requirementNotReviewed);
        return;
      }
      if (!r.ok) { toast.error(L.requirementStepFailed); return; }
      // Archived + cleared server-side — reflect that immediately rather than waiting for a re-fetch.
      setBrief("");
      setPending(false);
      toast.success(fill(L.requirementStepCreated, { step: d?.number ?? "" }), {
        description: L.requirementStepCopyDesc,
        duration: 30000,
        action: { label: L.requirementCopyBtn, onClick: () => void navigator.clipboard.writeText(d?.message ?? "") },
      });
    } catch {
      toast.error(L.requirementStepFailed);
    } finally {
      setStarting(false);
    }
  }

  if (loading) return <Loader2 className="size-4 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{L.requirementLabel}</span>
        {pending && <span className="text-xs text-amber-600 dark:text-amber-400">{L.requirementPendingHint}</span>}
      </div>
      <Textarea
        ref={briefRef}
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder={L.requirementPlaceholder}
        className="min-h-24 text-sm"
      />
      {/* The shared voice primitive (step 232) — one component for every input; never a second mic. In IP
          mode it disables itself with a hint (getUserMedia needs HTTPS). */}
      <VoiceInput targetRef={briefRef} value={brief} onChange={setBrief} />
      {/* "Add with AI" (step 239) — the SAME Quiz, on this entity as its subject. It brainstorms WHAT this
          part must do and writes the wording straight back into the field above; the owner still reviews it
          and presses Save. Never a second Quiz implementation. */}
      {automation && (
        <ActivationQuiz
          automation={automation}
          entity={entityType}
          entityName={entityLabel ?? entityType}
          open={quizOpen}
          onClose={() => setQuizOpen(false)}
          onApplied={(text) => { if (text) { setBrief(text); setPending(true); } }}
        />
      )}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => setQuizOpen(true)} disabled={!automation} className="gap-2">
          <Sparkles className="size-3.5" />
          {L.requirementAddWithAi}
        </Button>
        <Button size="sm" variant="outline" onClick={save} disabled={saving} className="gap-2">
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          {L.requirementSave}
        </Button>
        <Button size="sm" onClick={startDevelopment} disabled={starting || !brief.trim()} className="gap-2">
          {starting && <Loader2 className="size-3.5 animate-spin" />}
          {starting ? L.requirementStarting : L.requirementStartDev}
        </Button>
      </div>
    </div>
  );
}
