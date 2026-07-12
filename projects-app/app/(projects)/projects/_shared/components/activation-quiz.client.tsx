"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessagesSquare, Send, SkipForward, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// ACTIVATION QUIZ (step 227) — phase 2. Opens on the FIRST visit of a freshly created automation and turns
// the owner's instruction (phase 1) into real nodes through a brainstorm, in the project's DEFAULT LANGUAGE.
//
//   one quiz step = ONE node (a draft on the canvas) + ONE development sub-step handed to a coding agent.
//
// The owner may stop the questions at any moment ("Next node") or end the whole quiz ("Finish") — and still
// leaves with a working state: whatever was designed is on the canvas, its steps are queued, and the closing
// toast reports exactly where the automation stands. Capped at 10 nodes (context-overflow guard).
type Turn = { role: string; content: string };

export function ActivationQuiz({ automation }: { automation: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [nodeCount, setNodeCount] = useState(0);
  const [maxNodes, setMaxNodes] = useState(10);

  // First visit? (no quiz row yet) → open and ask the first question. An interrupted quiz resumes.
  useEffect(() => {
    void (async () => {
      const r = await fetch(`/api/projects/quiz?automation=${encodeURIComponent(automation)}`, { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { started: boolean; status?: string; turns?: Turn[]; nodeCount?: number; maxNodes?: number };
      setMaxNodes(d.maxNodes ?? 10);
      if (!d.started) { setOpen(true); void start(); return; }
      if (d.status === "active") { setTurns(d.turns ?? []); setNodeCount(d.nodeCount ?? 0); setOpen(true); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automation]);

  const start = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/quiz`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation }),
      });
      const d = (await r.json()) as { question?: string; error?: string };
      if (!r.ok) { toast.error(d.error ?? "Could not start the quiz."); return; }
      if (d.question) setTurns([{ role: "assistant", content: d.question }]);
    } finally { setBusy(false); }
  }, [automation]);

  const send = useCallback(async () => {
    if (!answer.trim() || busy) return;
    const mine = answer.trim();
    setAnswer("");
    setTurns((t) => [...t, { role: "user", content: mine }]);
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/quiz/answer`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation, answer: mine }),
      });
      const d = (await r.json()) as { question?: string; error?: string };
      if (!r.ok) { toast.error(d.error ?? "The model did not answer."); return; }
      if (d.question) setTurns((t) => [...t, { role: "assistant", content: d.question as string }]);
    } finally { setBusy(false); }
  }, [answer, automation, busy]);

  // Stop the questions → this brainstorm becomes ONE node + ONE development step, then the next node starts.
  const nextNode = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/quiz/next-node`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation }),
      });
      const d = (await r.json()) as {
        node?: { name: string }; step?: { number: number; message: string };
        nodeCount?: number; done?: boolean; question?: string | null; error?: string;
      };
      if (!r.ok) { toast.error(d.error ?? "Could not create the node."); return; }
      setNodeCount(d.nodeCount ?? 0);
      toast.success(`Node "${d.node?.name}" designed — development step #${d.step?.number} created`, {
        description: "Copy the brief and paste it into the coding agent's chat, or let the agent drain the queue.",
        duration: 20000,
        action: d.step ? { label: "Copy", onClick: () => void navigator.clipboard.writeText(d.step!.message) } : undefined,
      });
      setTurns(d.question ? [{ role: "assistant", content: d.question }] : []);
      if (d.done) await finish();
      router.refresh();
    } finally { setBusy(false); }
  }, [automation, router]);

  const finish = useCallback(async () => {
    const r = await fetch(`/api/projects/quiz/finish`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ automation }),
    });
    const d = (await r.json()) as { report?: string };
    setOpen(false);
    toast.info("Design session finished", { description: d.report, duration: 25000 });
    router.refresh();
  }, [automation, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessagesSquare className="size-4" /> Designing node {nodeCount + 1}
            <span className="text-xs font-normal text-muted-foreground">of at most {maxNodes}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
          {turns.length === 0 && busy && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Reading your instruction…
            </p>
          )}
          {turns.map((t, i) => (
            <div
              key={i}
              className={`rounded-lg p-3 text-sm ${
                t.role === "user" ? "ml-8 bg-primary/10" : "mr-8 bg-muted"
              }`}
            >
              {t.role !== "user" && (
                <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="size-3" /> Designer
                </p>
              )}
              <p className="whitespace-pre-wrap">{t.content}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t pt-3">
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            placeholder="Your answer…"
            disabled={busy}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={send} disabled={busy || !answer.trim()}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} Answer
            </Button>
            <Button size="sm" variant="outline" onClick={nextNode} disabled={busy}>
              <SkipForward className="size-3.5" /> Finish this node → next
            </Button>
            <Button size="sm" variant="ghost" onClick={finish} disabled={busy}>
              End the session
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Each node you finish becomes a draft on the diagram and a development step for the coding agent.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
