"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2, MessagesSquare, Pause, Send, SkipForward, Sparkles } from "lucide-react";
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
//
// STEP 225 G4 — the SAME component now serves three roles, without a second Quiz existing anywhere:
//   1. uncontrolled + automation  → the first-visit Quiz on an automation page (unchanged behaviour),
//   2. controlled (open/autoStart/onClose) + automation → the Quiz opened FROM THE GLOBAL CANVAS: either on
//      a brand-new automation (auto-quiz starts streaming immediately) or on an existing one (resumes),
//   3. controlled + edge → the LINK Quiz: the brainstorm designs how two automations are connected, and its
//      one artefact is the edge's spec.md + one development step (route /api/projects/quiz/edge-apply).
type Turn = { role: string; content: string };

export function ActivationQuiz({
  automation, edge, edgeName, open: openProp, autoStart, onClose,
}: {
  automation?: string;
  edge?: string;
  edgeName?: string;
  /** Controlled mode (the global canvas): the parent owns the open state. */
  open?: boolean;
  /** Start the streaming auto-quiz as soon as the session is created (used right after "Add automation"). */
  autoStart?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const controlled = openProp !== undefined;
  const isEdge = Boolean(edge);
  const [openState, setOpenState] = useState(false);
  const open = controlled ? Boolean(openProp) : openState;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [nodeCount, setNodeCount] = useState(0);
  const [maxNodes, setMaxNodes] = useState(10);
  const [streaming, setStreaming] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [aborter, setAborter] = useState<AbortController | null>(null);
  const booted = useRef(false);

  // The SUBJECT of every call: {edge} or {automation} — one API, two subjects (step 225 G4).
  const subject = useCallback(
    () => (isEdge ? { edge } : { automation }),
    [isEdge, edge, automation],
  );
  const query = isEdge
    ? `edge=${encodeURIComponent(edge ?? "")}`
    : `automation=${encodeURIComponent(automation ?? "")}`;

  const close = useCallback(() => {
    if (!controlled) setOpenState(false);
    onClose?.();
  }, [controlled, onClose]);

  const start = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/quiz`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subject()),
      });
      const d = (await r.json()) as { question?: string; error?: string };
      if (!r.ok) { toast.error(d.error ?? "Could not start the quiz."); return; }
      if (d.question) setTurns([{ role: "assistant", content: d.question }]);
    } finally { setBusy(false); }
  }, [subject]);

  // AUTO-QUIZ (227.B) — the model brainstorms with itself, STREAMING, so the owner reads it live. Pause at
  // any moment; the streamed text stays in an EDITABLE area, and saving the edit replaces the model's turn
  // — so the node (or the link) is synthesized from what the owner approved.
  const autoQuiz = useCallback(async () => {
    if (streaming) return;
    setStreaming(true);
    setDraftText("");
    const ctrl = new AbortController();
    setAborter(ctrl);
    try {
      const r = await fetch(`/api/projects/quiz/auto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subject()),
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
  }, [subject, streaming]);

  // Load the session. Uncontrolled (an automation page): a first visit OPENS the quiz; an interrupted one
  // resumes. Controlled (the global canvas): the parent already opened us — load, start if new, and stream
  // the auto-quiz straight away when the caller asked for it (a just-created automation).
  useEffect(() => {
    if (!open || booted.current) return;
    booted.current = true;
    void (async () => {
      const r = await fetch(`/api/projects/quiz?${query}`, { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { started: boolean; status?: string; turns?: Turn[]; nodeCount?: number; maxNodes?: number };
      setMaxNodes(d.maxNodes ?? 10);
      if (!d.started) await start();
      else { setTurns(d.turns ?? []); setNodeCount(d.nodeCount ?? 0); }
      if (autoStart) void autoQuiz();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  useEffect(() => {
    if (controlled || isEdge || !automation) return;
    void (async () => {
      const r = await fetch(`/api/projects/quiz?${query}`, { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { started: boolean; status?: string };
      // First visit (no session yet) or an interrupted one → open; the effect above then loads it.
      if (!d.started || d.status === "active") setOpenState(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        body: JSON.stringify({ ...subject(), answer: mine }),
      });
      const d = (await r.json()) as { question?: string; error?: string };
      if (!r.ok) { toast.error(d.error ?? "The model did not answer."); return; }
      if (d.question) setTurns((t) => [...t, { role: "assistant", content: d.question as string }]);
    } finally { setBusy(false); }
  }, [answer, busy, subject]);

  const finish = useCallback(async () => {
    const r = await fetch(`/api/projects/quiz/finish`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subject()),
    });
    const d = (await r.json()) as { report?: string; canTest?: boolean };
    close();
    // THE GUARANTEE (227.C): the session never ends with nothing — the owner is told exactly where the
    // subject stands and (for a project) can run the smoke test right from the toast.
    toast.info("Design session finished", {
      description: d.report,
      duration: 30000,
      action: isEdge || !automation
        ? undefined
        : {
            label: "Test it",
            onClick: () => {
              void (async () => {
                const t = await fetch(`/api/projects/test-run`, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ automation }),
                });
                const td = (await t.json()) as { ok?: boolean; verdict?: string; report?: string };
                (td.ok ? toast.success : toast.info)(td.verdict ?? "Test finished", { description: td.report, duration: 20000 });
              })();
            },
          },
    });
    router.refresh();
  }, [subject, isEdge, automation, close, router]);

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
  }, [automation, finish, router]);

  // THE LINK's closing move (225 G4): the brainstorm becomes the edge's spec.md + ONE development step —
  // the same file queue a node uses. A link is one subject, so the session ends here.
  const applyEdge = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/quiz/edge-apply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edge }),
      });
      const d = (await r.json()) as {
        edge?: { name: string }; step?: { number: number; message: string }; error?: string;
      };
      if (!r.ok) { toast.error(d.error ?? "Could not write the link brief."); return; }
      toast.success(`Link "${d.edge?.name}" designed — development step #${d.step?.number} created`, {
        description: "Copy the brief and paste it into the coding agent's chat, or let the agent drain the queue.",
        duration: 20000,
        action: d.step ? { label: "Copy", onClick: () => void navigator.clipboard.writeText(d.step!.message) } : undefined,
      });
      close();
      router.refresh();
    } finally { setBusy(false); }
  }, [edge, close, router]);

  const pause = useCallback(() => { aborter?.abort(); setStreaming(false); }, [aborter]);

  const saveEdit = useCallback(async () => {
    if (!draftText.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/projects/quiz/edit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...subject(), content: draftText }),
      });
      setTurns((t) => [...t, { role: "assistant", content: draftText }]);
      setDraftText("");
      toast.success(
        isEdge
          ? "Your edit replaced the model's text — the link will be built from it."
          : "Your edit replaced the model's text — the node will be built from it.",
      );
    } finally { setBusy(false); }
  }, [draftText, isEdge, subject]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (v) { if (!controlled) setOpenState(true); } else close(); }}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdge ? (
              <>
                <Link2 className="size-4" /> Designing the link
                <span className="truncate text-xs font-normal text-muted-foreground">{edgeName ?? ""}</span>
              </>
            ) : (
              <>
                <MessagesSquare className="size-4" /> Designing node {nodeCount + 1}
                <span className="text-xs font-normal text-muted-foreground">of at most {maxNodes}</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
          {turns.length === 0 && busy && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {isEdge ? "Reading both automations…" : "Reading your instruction…"}
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
            save; the node (or the link) is then built from YOUR text. */}
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
            {isEdge ? (
              <Button size="sm" variant="outline" onClick={applyEdge} disabled={busy || streaming}>
                <SkipForward className="size-3.5" /> Finish the link → development step
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={nextNode} disabled={busy || streaming}>
                <SkipForward className="size-3.5" /> Finish this node → next
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={finish} disabled={busy || streaming}>
              End the session
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {isEdge
              ? "Finishing the link writes its brief and queues one development step for the coding agent."
              : "Each node you finish becomes a draft on the diagram and a development step for the coding agent."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
