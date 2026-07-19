"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, ClipboardCopy, Loader2, Send, Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUiLang } from "../use-ui-lang";
import { warningStrings } from "../warning-i18n";
import { VoiceInput } from "./voice-input.client";
import type { EntityWarning } from "@/lib/entity-store";

// STEP 246 — the agent→owner escalation surfaces. TWO mounts of ONE block:
//   • the node drawer (BuilderNodePanel) shows the node's own warning under its brief;
//   • the automation-level PROBLEMS modal (Quiz-like, owner's design) lists every open warning one by one.
// STEP 247 — the block opens with the STATIC FRAMING (layer 1, i18n — the agent never writes it): a human
// sentence naming the node and the warning's short `subject`, then the per-kind "what you can do". Only
// after it comes the agent's plain-language `blocker` (layer 2); the Hermes technical brief (layer 3) stays
// behind the copy/reveal buttons. The answer field (voice via the ONE VoiceInput primitive) closes the loop:
// POST /api/projects/warning-answer archives the pair to history, clears the warning, and appends the answer
// to the object's rawRequest (it re-enters the wave).

export type WarningRow = { entityType: string; ref: string; warning: EntityWarning; label?: string };

export function WarningBlock({
  automation, entityType, refId, warning, label, onAnswered, onOpenSettings,
}: {
  automation: string; entityType: string; refId: string; warning: EntityWarning; label?: string; onAnswered?: () => void;
  /** Called right before the Settings modal opens — the HOSTING dialog must close itself first
      (263.1 round 7): two stacked Radix dialogs fight over focus/overlays and the close buttons of
      the lower one look dead (the owner could not close the problems modal at all). */
  onOpenSettings?: () => void;
}) {
  const W = warningStrings(useUiLang());
  // Layer 1 — the framing. Old warnings (written before step 247) have no `subject`; for them the framing
  // degrades to the per-kind action sentence alone, and the blocker still renders below.
  const subject = (warning.subject ?? "").trim();
  const intro = subject
    ? (label ? W.framingIntroNode.replace("{name}", label) : W.framingIntro).replace("{subject}", subject)
    : "";
  const action =
    warning.kind === "hermes-scout" ? W.framingScout :
    warning.kind === "owner-decision" ? W.framingDecision :
    warning.kind === "missing-credentials" ? W.framingCredentials.replace("{keys}", (warning.keys ?? []).join(", ")) :
    W.framingExternal;
  const [showInstruction, setShowInstruction] = useState(false);
  const [answer, setAnswer] = useState("");
  const [sending, setSending] = useState(false);
  const answerRef = useRef<HTMLTextAreaElement | null>(null);

  const send = useCallback(async () => {
    if (!answer.trim() || sending) return;
    setSending(true);
    try {
      const r = await fetch(`/api/projects/warning-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation, entityType, ref: refId, answer }),
      });
      if (r.ok) { toast.success(W.answerSent); setAnswer(""); onAnswered?.(); }
      else toast.error(W.answerFailed);
    } catch {
      toast.error(W.answerFailed);
    } finally {
      setSending(false);
    }
  }, [automation, entityType, refId, answer, sending, onAnswered, W.answerSent, W.answerFailed]);

  return (
    <div className="space-y-2 rounded-md border border-amber-500/60 bg-amber-500/10 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">{W.blockTitle}</p>
          {intro && <p className="break-words text-sm text-amber-900 dark:text-amber-100">{intro}</p>}
          <p className="break-words [overflow-wrap:anywhere] text-sm text-amber-900 dark:text-amber-100">{warning.blocker}</p>
          <p className="text-xs text-muted-foreground">{action}</p>
          {warning.expectedAnswer && (
            <p className="break-words text-xs text-muted-foreground">
              <span className="font-medium">{W.expectedLabel}:</span> {warning.expectedAnswer}
            </p>
          )}
        </div>
      </div>

      {/* Step 248 — kind missing-credentials: the keys are SETTINGS fields, not an answer to paste. The
          list + one button that opens the Settings modal (a CustomEvent the AutomationMenu listens for);
          saving the keys there auto-resolves this warning server-side. The answer field below stays as the
          manual fallback. */}
      {warning.kind === "missing-credentials" && (
        <div className="space-y-2">
          {(warning.keys ?? []).length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">{W.keysLabel}:</span>
              {(warning.keys ?? []).map((k) => (
                <code key={k} className="rounded bg-muted/60 px-1.5 py-0.5 text-xs">{k}</code>
              ))}
            </div>
          )}
          <Button
            size="sm" variant="outline" className="gap-1.5"
            onClick={() => {
              onOpenSettings?.(); // close the hosting dialog FIRST — never stack two Radix dialogs
              window.dispatchEvent(new CustomEvent("automation:open-settings", { detail: { automation } }));
            }}
          >
            <Settings className="size-3.5" /> {W.openSettings}
          </Button>
        </div>
      )}

      {/* Step 250 — kind owner-decision joins hermes-scout here: the develop agent's saved decomposition
          plan lives in hermesInstruction. Step 253 — owner-decision gets its OWN button labels (it is a
          plan the OWNER executes, not a brief for Hermes): "Show the plan" / "Copy the plan". */}
      {(warning.kind === "hermes-scout" || warning.kind === "owner-decision") && warning.hermesInstruction && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowInstruction((v) => !v)}>
              {warning.kind === "owner-decision" ? W.decisionReveal : W.scoutButton}
            </Button>
            <Button
              size="sm" variant="ghost" className="gap-1"
              onClick={async () => { await navigator.clipboard.writeText(warning.hermesInstruction ?? ""); toast.success(W.copied); }}
            >
              <ClipboardCopy className="size-3.5" /> {warning.kind === "owner-decision" ? W.decisionCopy : W.copyInstruction}
            </Button>
          </div>
          {showInstruction && (
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-muted/40 p-2 text-xs">
              {warning.hermesInstruction}
            </pre>
          )}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">{W.answerLabel}</label>
        <Textarea
          ref={answerRef}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={W.answerPlaceholder}
          className="min-h-20 bg-background text-sm"
        />
        <VoiceInput targetRef={answerRef} value={answer} onChange={setAnswer} disabled={sending} />
      </div>
      <Button size="sm" onClick={send} disabled={sending || !answer.trim()} className="gap-2">
        {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
        {W.sendAnswer}
      </Button>
    </div>
  );
}

/** The ⚠ N badge + the problems modal — mounted by the wave banner (present on every automation page). */
export function ProblemsCenter({ automation }: { automation: string }) {
  const W = warningStrings(useUiLang());
  const [rows, setRows] = useState<WarningRow[]>([]);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const autoOpened = useRef(false);

  const refetch = useCallback(async () => {
    try {
      const r = await fetch(`/api/projects/entity-warning?automation=${encodeURIComponent(automation)}`, { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { warnings?: WarningRow[] };
      setRows(d.warnings ?? []);
    } catch { /* keep last */ }
  }, [automation]);

  useEffect(() => {
    void refetch();
    const t = setInterval(() => { if (document.visibilityState === "visible") void refetch(); }, 5000);
    return () => clearInterval(t);
  }, [refetch]);

  // Auto-open ONCE per page load when open problems exist — the owner must not miss that development came
  // back asking for help. Afterwards the badge re-opens it any time.
  useEffect(() => {
    if (rows.length && !autoOpened.current) { autoOpened.current = true; setOpen(true); }
  }, [rows.length]);

  if (!rows.length) return null;
  const i = Math.min(idx, rows.length - 1);
  const row = rows[i];

  return (
    <>
      <div className="flex justify-start">
        <Button
          size="sm" variant="outline" onClick={() => setOpen(true)} aria-label={W.problemsBadge} title={W.problemsBadge}
          className="gap-2 border-amber-500/60 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 dark:text-amber-200"
        >
          <AlertTriangle className="size-3.5" /> ⚠ {rows.length}
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[600px] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" /> {W.problemsTitle}
            </DialogTitle>
            <DialogDescription>{W.problemsDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* STEP 247 — a human header: the node's name (enriched by the GET route) or the warning's own
                short subject; NEVER a raw cuid in the owner's face. */}
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate font-medium">{row.label || row.warning.subject || row.entityType}</span>
              <span className="shrink-0">{W.ofCounter.replace("{i}", String(i + 1)).replace("{n}", String(rows.length))}</span>
            </div>
            <WarningBlock
              automation={automation} entityType={row.entityType} refId={row.ref} warning={row.warning} label={row.label}
              onAnswered={() => { void refetch(); setIdx(0); }}
              onOpenSettings={() => setOpen(false)}
            />
            {rows.length > 1 && (
              <div className="flex justify-between">
                <Button size="sm" variant="ghost" onClick={() => setIdx((v) => Math.max(0, v - 1))} disabled={i === 0}>
                  <ChevronLeft className="size-3.5" /> {W.prev}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIdx((v) => Math.min(rows.length - 1, v + 1))} disabled={i >= rows.length - 1}>
                  {W.next} <ChevronRight className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
