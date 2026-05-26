"use client";

import { useState } from "react";
import { Check, AlertTriangle, X, ChevronRight, Flag, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Verdict = "approved" | "partial" | "rework" | "milestone_done" | "continue";

type Props = {
  taskId: string;
  taskSummary?: string;
  open: boolean;
  onClose: () => void;
  onSubmitted?: (verdict: Verdict) => void;
};

const PRIMARY: { id: Verdict; label: string; icon: React.ElementType; cls: string }[] = [
  { id: "approved", label: "Approved",  icon: Check,         cls: "border-green-500/50 text-green-500 bg-green-500/5  hover:bg-green-500/15" },
  { id: "partial",  label: "Partial",   icon: AlertTriangle, cls: "border-amber-500/50 text-amber-500 bg-amber-500/5  hover:bg-amber-500/15" },
  { id: "rework",   label: "Rework",    icon: X,             cls: "border-red-500/50   text-red-500   bg-red-500/5    hover:bg-red-500/15" },
];

const MILESTONE: { id: Verdict; label: string; icon: React.ElementType; cls: string }[] = [
  { id: "milestone_done", label: "Milestone done",  icon: Flag,        cls: "border-blue-500/50   text-blue-500   bg-blue-500/5   hover:bg-blue-500/15" },
  { id: "continue",       label: "Continue →",      icon: ChevronRight, cls: "border-purple-500/50 text-purple-500 bg-purple-500/5 hover:bg-purple-500/15" },
];

export function HermesFeedbackModal({ taskId, taskSummary, open, onClose, onSubmitted }: Props) {
  const [verdict, setVerdict]         = useState<Verdict | null>(null);
  const [comment, setComment]         = useState("");
  const [isMilestone, setIsMilestone] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);

  function handleClose() {
    setVerdict(null); setComment(""); setIsMilestone(false); setSubmitting(false); setSubmitted(false);
    onClose();
  }

  async function handleSubmit() {
    if (!verdict || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/hermes/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, verdict, comment: comment.trim(), is_milestone: isMilestone }),
      });
      setSubmitted(true);
      onSubmitted?.(verdict);
      setTimeout(handleClose, 1400);
    } catch {
      setSubmitting(false);
    }
  }

  const activeList = isMilestone ? MILESTONE : PRIMARY;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">How was this work?</DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-2 py-6 text-sm text-muted-foreground">
            <Check size={24} className="text-green-500" />
            Feedback saved. Thank you.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {taskSummary && (
              <p className="text-[11px] text-muted-foreground border border-border rounded-md px-3 py-2 bg-muted/30 line-clamp-2">
                {taskSummary}
              </p>
            )}

            {/* Verdict buttons */}
            <div className="flex gap-2">
              {(isMilestone ? MILESTONE : PRIMARY).map(({ id, label, icon: Icon, cls }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setVerdict(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md border h-9 text-[12px] font-medium transition-all ${cls} ${verdict === id ? "ring-1 ring-current" : "opacity-70 hover:opacity-100"}`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>

            {/* Milestone toggle */}
            <label className="flex items-center gap-2 text-[12px] text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isMilestone}
                onChange={(e) => { setIsMilestone(e.target.checked); setVerdict(null); }}
                className="rounded border-input"
              />
              This was a milestone (multi-step task)
            </label>

            {/* Comment */}
            <div className="relative">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional comment…"
                className="w-full min-h-[64px] max-h-[128px] resize-y rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                rows={3}
              />
              <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/40 select-none pointer-events-none">
                {comment.length}
              </span>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={!verdict || submitting}>
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Submit
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
