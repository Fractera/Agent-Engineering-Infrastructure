"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, Link2, ListChecks, Loader2, MessagesSquare, Pause, Send, SkipForward, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// ACTIVATION QUIZ (step 227) — phase 2 of an automation's birth. Opens on the FIRST visit of a freshly
// created automation and turns the owner's instruction (phase 1) into a real automation through a brainstorm,
// in the project's DEFAULT LANGUAGE.
//
// STEP 231 — the Quiz now starts with the USER CASES, and only then designs nodes:
//   PHASE "usecases" → the owner describes every scenario (free speech, voice encouraged). Nothing can be
//                      built before this: the server refuses a node, and a development step, without them.
//   PHASE "nodes"    → one quiz step = ONE node (a draft on the canvas) + ONE development sub-step.
//
// The owner may stop the questions at any moment ("Next node") or end the whole quiz ("Finish") — and still
// leaves with a working state: whatever was designed is on the canvas, its steps are queued, and the closing
// toast reports exactly where the automation stands. Capped at 10 nodes (context-overflow guard).
//
// FOUR SUBJECTS, one component (no second Quiz exists anywhere):
//   1. automation (uncontrolled)  → the first-visit Quiz on an automation page,
//   2. automation (controlled)    → the same Quiz opened from the GLOBAL CANVAS (225 G4),
//   3. edge                       → the LINK Quiz: how two automations are connected,
//   4. useCase / cases (step 231) → revisiting the scenarios of a LIVE automation (the pencils on the Use
//      cases panel). Its closing move writes the new case text + one development step per changed case.
type Turn = { role: string; content: string };
type Phase = "usecases" | "nodes";

export function ActivationQuiz({
  automation, edge, edgeName, useCase, useCaseName, cases,
  open: openProp, autoStart, onClose,
}: {
  automation?: string;
  edge?: string;
  edgeName?: string;
  /** Revisit ONE user case (its cuid) — the pencil on a case. */
  useCase?: string;
  useCaseName?: string;
  /** Revisit the WHOLE set of user cases — the pencil on the panel's header (needs `automation`). */
  cases?: boolean;
  /** Controlled mode (the global canvas, the Use cases panel): the parent owns the open state. */
  open?: boolean;
  /** Start the streaming auto-quiz as soon as the session is created (used right after "Add automation"). */
  autoStart?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const controlled = openProp !== undefined;
  const isEdge = Boolean(edge);
  const isCaseEdit = Boolean(useCase) || Boolean(cases);
  const [openState, setOpenState] = useState(false);
  const open = controlled ? Boolean(openProp) : openState;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Phase>(isEdge || isCaseEdit ? "nodes" : "usecases");
  const [nodeCount, setNodeCount] = useState(0);
  const [maxNodes, setMaxNodes] = useState(10);
  const [streaming, setStreaming] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [aborter, setAborter] = useState<AbortController | null>(null);
  const booted = useRef(false);

  // The SUBJECT of every call — one API, four subjects (steps 225 G4 + 231).
  const subject = useCallback(() => {
    if (useCase) return { useCase };
    if (cases) return { automation, cases: true };
    if (isEdge) return { edge };
    return { automation };
  }, [useCase, cases, isEdge, edge, automation]);

  const query = useCase
    ? `useCase=${encodeURIComponent(useCase)}`
    : cases
      ? `automation=${encodeURIComponent(automation ?? "")}&cases=1`
      : isEdge
        ? `edge=${encodeURIComponent(edge ?? "")}`
        : `automation=${encodeURIComponent(automation ?? "")}`;

  const close = useCallback(() => {
    if (!controlled) setOpenState(false);
    onClose?.();
  }, [controlled, onClose]);

  // Start the session — or RE-open one the owner had ended (the canvas can reopen a finished Quiz; the
  // 10-node cap still holds and the server says so).
  const start = useCallback(async (reopen = false) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/quiz`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...subject(), reopen }),
      });
      const d = (await r.json()) as { question?: string | null; error?: string; capped?: boolean; turns?: Turn[]; phase?: Phase };
      if (!r.ok) { toast.error(d.error ?? "Could not start the quiz."); return; }
      if (d.capped) { toast.info(d.error ?? "This design session is complete."); return; }
      if (d.phase) setPhase(d.phase);
      if (d.turns?.length) setTurns(d.turns);
      else if (d.question) setTurns([{ role: "assistant", content: d.question }]);
    } finally { setBusy(false); }
  }, [subject]);

  // AUTO-QUIZ (227.B) — the model brainstorms with itself, STREAMING, so the owner reads it live. Pause at
  // any moment; the streamed text stays in an EDITABLE area, and saving the edit replaces the model's turn
  // — so what gets built (the cases, the node, the link) is made from what the owner approved.
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
  // resumes. Controlled (the global canvas, a pencil): the parent already opened us — load, start if new, and
  // stream the auto-quiz straight away when the caller asked for it (a just-created automation).
  useEffect(() => {
    if (!open || booted.current) return;
    booted.current = true;
    void (async () => {
      const r = await fetch(`/api/projects/quiz?${query}`, { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { started: boolean; status?: string; turns?: Turn[]; nodeCount?: number; maxNodes?: number; phase?: Phase };
      setMaxNodes(d.maxNodes ?? 10);
      if (d.phase) setPhase(d.phase);
      if (!d.started) {
        await start();
      } else {
        setTurns(d.turns ?? []);
        setNodeCount(d.nodeCount ?? 0);
        // Opened again from the global canvas after the owner had ended it → revive the session.
        if (controlled && d.status === "done") await start(true);
      }
      if (autoStart) void autoQuiz();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  useEffect(() => {
    if (controlled || isEdge || isCaseEdit || !automation) return;
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
      action: isEdge || isCaseEdit || !automation
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
  }, [subject, isEdge, isCaseEdit, automation, close, router]);

  // PHASE 1 → PHASE 2 (step 231): the scenarios are described → they become numbered user cases, and the Quiz
  // moves on to the nodes. A refusal here IS the gate: without a real description nothing gets built.
  const applyUseCases = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/quiz/usecases-apply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation }),
      });
      const d = (await r.json()) as { cases?: { title: string }[]; question?: string | null; error?: string };
      if (!r.ok) { toast.error(d.error ?? "The user cases are not ready yet.", { duration: 12000 }); return; }
      setPhase("nodes");
      setTurns(d.question ? [{ role: "assistant", content: d.question }] : []);
      toast.success(`${d.cases?.length ?? 0} user case${d.cases?.length === 1 ? "" : "s"} written`, {
        description: "Read them in the Use cases panel and confirm them — development starts only after that. Now we design the nodes.",
        duration: 15000,
      });
      router.refresh();
    } finally { setBusy(false); }
  }, [automation, router]);

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
        nodeCount?: number; done?: boolean; question?: string | null; error?: string; reason?: string;
      };
      if (!r.ok) {
        // The user-case gate (231): no cases yet, or the owner has not confirmed the current set.
        const gated = d.reason === "no-cases" || d.reason === "not-reviewed" || d.reason === "usecases-phase";
        toast.error(d.error ?? "Could not create the node.", {
          duration: 15000,
          action: gated
            ? {
                label: "Open user cases",
                onClick: () => window.dispatchEvent(new CustomEvent("usecases:review", { detail: { automation } })),
              }
            : undefined,
        });
        return;
      }
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

  // THE PENCIL's closing move (231): the revisited scenarios become the cases' new text + ONE development
  // step per case that changed. Which nodes those cases touch is the coding agent's job to work out.
  const applyCaseEdit = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/quiz/usecase-apply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subject()),
      });
      const d = (await r.json()) as {
        changed?: number; report?: string; error?: string;
        steps?: { number: number; message: string; title: string }[];
      };
      if (!r.ok) { toast.error(d.error ?? "Could not save the user cases."); return; }
      const first = d.steps?.[0];
      (d.changed ? toast.success : toast.info)(
        d.changed ? `${d.changed} user case${d.changed === 1 ? "" : "s"} updated` : "Nothing changed",
        {
          description: d.report,
          duration: 20000,
          action: first
            ? { label: "Copy step", onClick: () => void navigator.clipboard.writeText(first.message) }
            : undefined,
        },
      );
      close();
      router.refresh();
    } finally { setBusy(false); }
  }, [subject, close, router]);

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
      toast.success("Your edit replaced the model's text — what gets built comes from it.");
    } finally { setBusy(false); }
  }, [draftText, subject]);

  // Leaving the use-case phase without cases is allowed (the owner may be interrupted), but it is never
  // silent: the automation cannot be built until they exist, and the Quiz reopens on the next visit.
  const onOpenChange = (v: boolean) => {
    if (v) { if (!controlled) setOpenState(true); return; }
    if (!isEdge && !isCaseEdit && phase === "usecases") {
      toast.warning("The user cases are still missing", {
        description: "Without a detailed description the automation cannot be created — this opens again on your next visit.",
        duration: 12000,
      });
    }
    close();
  };

  const title = isEdge ? (
    <>
      <Link2 className="size-4" /> Designing the link
      <span className="truncate text-xs font-normal text-muted-foreground">{edgeName ?? ""}</span>
    </>
  ) : isCaseEdit ? (
    <>
      <ListChecks className="size-4" /> {useCase ? "Revisiting a user case" : "Revisiting the user cases"}
      <span className="truncate text-xs font-normal text-muted-foreground">{useCaseName ?? automation ?? ""}</span>
    </>
  ) : phase === "usecases" ? (
    <>
      <ListChecks className="size-4" /> The user cases
      <span className="text-xs font-normal text-muted-foreground">described first — before anything is built</span>
    </>
  ) : (
    <>
      <MessagesSquare className="size-4" /> Designing node {nodeCount + 1}
      <span className="text-xs font-normal text-muted-foreground">of at most {maxNodes}</span>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{title}</DialogTitle>
        </DialogHeader>

        {/* Owner's note: planning is where the model's strength shows most — a weak model designs a weak
            automation. The model is chosen in the automation menu (the hamburger, top right of the page). */}
        <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            Planning an automation works far better with the most powerful model available to you. Pick it in
            the hamburger menu at the top of the page (Settings → model).
          </p>
        </div>

        <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
          {turns.length === 0 && busy && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {isEdge ? "Reading both automations…" : isCaseEdit ? "Reading the automation…" : "Reading your instruction…"}
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
            save; what gets built is then made from YOUR text. */}
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
            placeholder={
              phase === "usecases" && !isEdge && !isCaseEdit
                ? "Describe your scenarios — speak freely; dictation is the fastest way…"
                : "Your answer…"
            }
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
            ) : isCaseEdit ? (
              <Button size="sm" variant="outline" onClick={applyCaseEdit} disabled={busy || streaming}>
                <SkipForward className="size-3.5" /> Save the cases → development step
              </Button>
            ) : phase === "usecases" ? (
              <Button size="sm" variant="outline" onClick={applyUseCases} disabled={busy || streaming}>
                <SkipForward className="size-3.5" /> The cases are ready → design the nodes
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={nextNode} disabled={busy || streaming}>
                <SkipForward className="size-3.5" /> Finish this node → next
              </Button>
            )}
            {!(phase === "usecases" && !isEdge && !isCaseEdit) && (
              <Button size="sm" variant="ghost" onClick={finish} disabled={busy || streaming}>
                End the session
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isEdge
              ? "Finishing the link writes its brief and queues one development step for the coding agent."
              : isCaseEdit
                ? "Saving writes the new case text and queues one development step per case you changed."
                : phase === "usecases"
                  ? "Nothing is built until the scenarios exist: they become your numbered user cases, and the nodes are designed from them."
                  : "Each node you finish becomes a draft on the diagram and a development step for the coding agent."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
