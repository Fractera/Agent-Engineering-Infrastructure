"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Hammer, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useUiLang } from "../use-ui-lang";
import { automationMenuStrings } from "../automation-menu-i18n";
import { VoiceInput } from "./voice-input.client";
import { ActivationQuiz } from "./activation-quiz.client";
import { useWaveLock } from "./wave-lock.client";
import type { EntityType } from "@/lib/entity-store";

// THE REQUIREMENT BRIEF PANEL (step 238 P5-P9) — the authoring surface for the entities that had NONE until
// then (Dashboard/Analytics/Calendar/Map/Processes, and fork-activation since step 239): a free-text field
// for "the next thing I need here", same shape as the chain brief. One component, reused for all of them —
// they are structurally identical (a single free-text transport field, automation-scoped, ref='').
//
// STEP 240 — this panel DISPATCHES NOTHING any more. "Save" writes the brief into the entity's transport
// container (<entity>-architecture/add-new-transport-task-entry), which STAGES it (pending:true); the page's
// single wave banner hands every staged change to a coding agent as ONE development step. The old per-entity
// "Start development" button is gone — along with every other one on the page — so a hand-off cannot happen
// behind the page lock's back.
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
  refId = "",
  scopeLabel,
}: {
  entityType: EntityType;
  /** The entity's translated name — shown as the Quiz's subtitle. Falls back to the raw type. */
  entityLabel?: string;
  automation?: string;
  /** Instance scope (owner 2026-07-16, per-table dashboard requirements): '' = the automation-wide brief
   *  (the historic behaviour); a table id scopes this panel to THAT table's own transport slot — the same
   *  stores, keyed by ref, so the wave picks a staged table requirement up automatically. */
  refId?: string;
  /** The grammatically-correct scope word for the "Build mode — …" button (requirement-scope-i18n, owner
   *  2026-07-16): «Режим строительства — таблицы / дашборда / карты …». NEVER a table's own title. The Quiz
   *  subject keeps `entityLabel`. */
  scopeLabel?: string;
}) {
  const L = automationMenuStrings(useUiLang());
  // The page-wide development lock (step 240): while a wave is with a coding agent, every tool here refuses
  // to act and shows the lock modal instead — the brief the coder is working from must not change.
  const { guard, refresh: refreshWave } = useWaveLock();
  const [brief, setBrief] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // "Add with AI" (step 239) — opens the SAME Quiz, on the `entity` subject. Controlled: this panel owns the
  // open state, and the closing move hands the requirement text straight back into the textarea below.
  const [quizOpen, setQuizOpen] = useState(false);
  // Caret target for the shared VoiceInput primitive (step 232) — spoken text lands where the cursor is.
  const briefRef = useRef<HTMLTextAreaElement | null>(null);
  // CONSTRUCTION MODE (step 243.2, owner's design): this authoring block used to render wide open the
  // instant the accordion item opened — visually loud for a tool most visits never touch. COLLAPSED by
  // default now; a separator + one button reveal it. A pending (staged) requirement still gets its own
  // hint even collapsed, so the owner isn't hiding work he already started.
  const [buildMode, setBuildMode] = useState(false);

  useEffect(() => {
    if (!automation) return;
    let alive = true;
    setLoading(true);
    fetch(`/api/projects/${entityType}-architecture/extract-current-state-for-architecture?automation=${encodeURIComponent(automation)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { instances?: { ref?: string; currentTask?: { brief?: string } | null; pending?: boolean }[] } | null) => {
        if (!alive) return;
        // Match by ref: '' = the automation-wide instance (the historic single-instance behaviour), a table
        // id = that table's own instance (per-table dashboard requirements, 2026-07-16).
        const inst = d?.instances?.find((i) => (i.ref ?? "") === refId);
        setBrief(inst?.currentTask?.brief ?? "");
        setPending(Boolean(inst?.pending));
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [automation, entityType, refId]);

  async function save() {
    if (!automation || !guard()) return;   // locked → the modal explains why nothing happened
    setSaving(true);
    try {
      const r = await fetch(`/api/projects/${entityType}-architecture/add-new-transport-task-entry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation, ref: refId, payload: { brief } }),
      });
      if (!r.ok) throw new Error(String(r.status));
      setPending(brief.trim().length > 0);
      toast.success(L.requirementSaved);
      refreshWave();   // a saved requirement is a STAGED change — the banner must appear at once (step 240)
    } catch {
      toast.error(L.requirementSaveFail);
    } finally {
      setSaving(false);
    }
  }

  // STEP 240 — this panel no longer dispatches anything. Saving STAGES the requirement (pending:true); the
  // page's single banner hands the whole batch over as one wave. The per-entity "Start development" button
  // that used to live here is gone, along with every other one on the page.

  if (loading) return <Loader2 className="size-4 animate-spin text-muted-foreground" />;

  // The SCOPE suffix (owner 2026-07-16): two of these panels can sit near each other (per-table + whole
  // dashboard), and every entity's panel must name what it builds — «Режим строительства — таблицы /
  // дашборда / карты …» (the grammatically-correct scope word, requirement-scope-i18n), NEVER a table's own
  // title (the owner's explicit correction).
  const scope = scopeLabel ? ` — ${scopeLabel}` : "";

  if (!buildMode) {
    return (
      <div className="space-y-2">
        <Separator />
        <Button size="sm" variant="ghost" onClick={() => setBuildMode(true)} className="gap-2 text-muted-foreground">
          <Hammer className="size-3.5" />
          {L.requirementBuildMode}{scope}
          {pending && <span className="text-amber-600 dark:text-amber-400">· {L.requirementPendingHint}</span>}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{L.requirementLabel}{scope}</span>
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
          onApplied={(text) => { if (text) { setBrief(text); setPending(true); refreshWave(); } }}
        />
      )}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => { if (guard()) setQuizOpen(true); }}
          disabled={!automation}
          className="gap-2"
        >
          <Sparkles className="size-3.5" />
          {L.requirementAddWithAi}
        </Button>
        <Button size="sm" variant="outline" onClick={save} disabled={saving} className="gap-2">
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          {L.requirementSave}
        </Button>
      </div>
    </div>
  );
}
