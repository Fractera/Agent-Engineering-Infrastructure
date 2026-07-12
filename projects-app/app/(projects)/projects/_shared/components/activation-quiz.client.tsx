"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessagesSquare, Pause, Send, SkipForward, Sparkles } from "lucide-react";
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
  const [streaming, setStreaming] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [aborter, setAborter] = useState<AbortController | null>(null);

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

  // AUTO-QUIZ (227.B) — the model brainstorms with itself, STREAMING, so the owner reads it live. Pause at
  // any moment; the streamed text stays in an EDITABLE area, and saving the edit replaces the model's turn
  // — so the node is synthesized from what the owner approved.
  const autoQuiz = useCallback(async () => {
    if (busy || streaming) return;
    setStreaming(true);
    setDraftText("");
    const ctrl = new AbortController();
    setAborter(ctrl);
    try {
      const r = await fetch(`/api/projects/quiz/auto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation }),
        signal: ctrl.signal,
      });
      if (!r.ok || !r.body) { toast.error("Auto-quiz could not start."); return; }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const s = line.trim();
          if (!s.startsWith("data:")) continue;
          const payload = s.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload) as { delta?: string };
            if (j.delta) setDraftText((t) => t + j.delta);
          } catch { /* partial frame */ }
        }
      }
    } catch { /* paused by the owner — keep what was streamed */ } finally {
      setStreaming(false);
      setAborter(null);
    }
  }, [automation, busy, streaming]);

  const pause = useCallback(() => { aborter?.abort(); setStreaming(false); }, [aborter]);

  const saveEdit = useCallback(async () => {
    if (!draftText.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/projects/quiz/edit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation, content: draftText }),
      });
      setTurns((t) => [...t, { role: "assistant", content: draftText }]);
      setDraftText("");
      toast.success("Your edit replaced the model's text — the node will be built from it.");
    } finally { setBusy(false); }
  }, [automation, draftText]);

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

        {/* AUTO-QUIZ (227.B): the model thinks out loud, streamed. The area stays EDITABLE — pause, rewrite,
            save; the node is then built from YOUR text. */}
        {(streaming || draftText) && (
          <div className="space-y-2 rounded-lg border border-primary/40 p-2">
            <p className="flex items-center gap-1 text-xs font-medium text-primary">
              <Sparkles className="size-3" /> Auto-quiz {streaming ? "— writing… (you can pause and edit)" : "— paused, edit freely"}
            </p>
            <Textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={7}
              className="text-sm"
            />
            <div className="flex flex-wrap gap-2">
              {streaming ? (
                <Button size="sm" variant="outline" onClick={pause}>
                  <Pause className="size-3.5" /> Pause
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={autoQuiz} disabled={busy}>
                  <Sparkles className="size-3.5" /> Continue auto-quiz
                </Button>
              )}
              <Button size="sm" onClick={saveEdit} disabled={busy || streaming || !draftText.trim()}>
                <Send className="size-3.5" /> Keep this text
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2 border-t pt-3">
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            placeholder="Your answer…"
            disabled={busy || streaming}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={send} disabled={busy || streaming || !answer.trim()}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} Answer
            </Button>
            <Button size="sm" variant="secondary" onClick={autoQuiz} disabled={busy || streaming}>
              <Sparkles className="size-3.5" /> Auto-quiz
            </Button>
            <Button size="sm" variant="outline" onClick={nextNode} disabled={busy || streaming}>
              <SkipForward className="size-3.5" /> Finish this node → next
            </Button>
            <Button size="sm" variant="ghost" onClick={finish} disabled={busy || streaming}>
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
