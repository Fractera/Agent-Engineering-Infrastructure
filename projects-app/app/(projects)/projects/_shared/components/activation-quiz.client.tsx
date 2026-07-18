"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, ChevronDown, Link2, ListChecks, Loader2, MessagesSquare, Pause, Send, SkipForward, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInput } from "./voice-input.client";
import { useUiLang } from "../use-ui-lang";
import { fill, quizStrings, entityQuizStrings } from "../quiz-i18n";

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
  automation, edge, edgeName, useCase, useCaseName, cases, entity, entityName, onApplied,
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
  /** STEP 239 — the ENTITY subject: "Add with AI" on a Requirement panel (dashboard/analytics/calendar/map/
   *  processes/fork-activation). Needs `automation`; its closing move writes the requirement into that
   *  entity's transport container and calls `onApplied` so the panel shows it without a reload. */
  entity?: string;
  entityName?: string;
  onApplied?: (brief: string) => void;
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
  const isEntity = Boolean(entity);
  const [openState, setOpenState] = useState(false);
  const open = controlled ? Boolean(openProp) : openState;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Phase>(isEdge || isCaseEdit || isEntity ? "nodes" : "usecases");
  const [nodeCount, setNodeCount] = useState(0);
  const [maxNodes, setMaxNodes] = useState(10);
  const [streaming, setStreaming] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [aborter, setAborter] = useState<AbortController | null>(null);
  // Step 247 (owner's two-button flow): once Auto-quiz has been pressed in a use-cases session, its button
  // is REPLACED by "Continue auto" + "Keep this Quiz" (the latter saves the draft and finishes the cases —
  // the old cases-ready action, whose own button is gone).
  const [autoUsed, setAutoUsed] = useState(false);
  const booted = useRef(false);
  // READY highlight (step 247, owner's fix for "which button do I press to leave the Quiz?"): once the
  // model has replied READY (the /answer route's signal — enough scenarios collected), the EXIT button
  // ("The cases are ready" / "Save the cases") turns orange and pulses gently. STICKY for the session —
  // the owner may keep talking past READY, the exit stays lit. Derived from the transcript itself, so a
  // reopened session that was already READY lights up too.
  const ready = turns.some((t) => t.role === "assistant" && /^READY\b/i.test(t.content.trim()));
  const readyPulse = ready
    ? "animate-pulse border-orange-500 text-orange-600 hover:text-orange-600 dark:border-orange-400 dark:text-orange-400"
    : "";
  // The field voice writes into (step 232): the transcript lands at the CARET, so the owner can dictate into
  // the middle of what he already wrote.
  const answerRef = useRef<HTMLTextAreaElement | null>(null);
  // "Scroll to newest" (owner): when a fresh question arrives BELOW the fold, the transcript does not visibly
  // move, so it is easy to miss. A gentle chat-style button appears whenever content sits below the viewport
  // (a new turn, or the owner scrolled up) and smooth-scrolls to the bottom on click.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const nearBottom = () => {
    const el = scrollRef.current;
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };
  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };
  // On new content: if the owner was already at the bottom, keep him pinned; otherwise reveal the button.
  useEffect(() => {
    if (nearBottom()) scrollToBottom();
    else setShowScrollDown(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turns, draftText, streaming]);
  // The UI language of the modal (owner's rule, six languages) — the shared hook, memoized per page.
  const uiLang = useUiLang();
  const L = quizStrings(uiLang);
  const E = entityQuizStrings(uiLang);

  // The SUBJECT of every call — one API, five subjects (steps 225 G4 + 231 + 239).
  const subject = useCallback(() => {
    if (useCase) return { useCase };
    if (cases) return { automation, cases: true };
    if (isEdge) return { edge };
    if (isEntity) return { automation, entity };
    return { automation };
  }, [useCase, cases, isEdge, isEntity, edge, entity, automation]);

  const query = useCase
    ? `useCase=${encodeURIComponent(useCase)}`
    : cases
      ? `automation=${encodeURIComponent(automation ?? "")}&cases=1`
      : isEdge
        ? `edge=${encodeURIComponent(edge ?? "")}`
        : isEntity
          ? `automation=${encodeURIComponent(automation ?? "")}&entity=${encodeURIComponent(entity ?? "")}`
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
      if (!r.ok) { toast.error(d.error ?? L.errStart); return; }
      if (d.capped) { toast.info(d.error ?? L.errComplete); return; }
      if (d.phase) setPhase(d.phase);
      if (d.turns?.length) setTurns(d.turns);
      else if (d.question) setTurns([{ role: "assistant", content: d.question }]);
    } finally { setBusy(false); }
  }, [subject, L]);

  // AUTO-QUIZ (227.B) — the model brainstorms with itself, STREAMING, so the owner reads it live. Pause at
  // any moment; the streamed text stays in an EDITABLE area, and saving the edit replaces the model's turn
  // — so what gets built (the cases, the node, the link) is made from what the owner approved.
  const autoQuiz = useCallback(async () => {
    if (streaming) return;
    setAutoUsed(true);
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
      if (!r.ok || !r.body) { toast.error(L.errAutoStart); return; }
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
  }, [subject, streaming, L]);

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
    // The FIRST-VISIT auto-open is the project subject only: an edge, a case pencil and an entity's "Add with
    // AI" (239) are always opened deliberately by their caller (controlled), never on their own.
    if (controlled || isEdge || isCaseEdit || isEntity || !automation) return;
    void (async () => {
      // PRIORITY (step 247, owner's find on automation-14): OPEN PROBLEMS OUTRANK THE QUIZ. When a coding
      // agent has left warnings, the owner's first duty on this page is to answer them — the problems modal
      // auto-opens (warning-panel.client), and the Quiz must NOT bury it under a second dialog. It stays
      // reachable as ever (its own buttons); it just does not auto-open while a warning is unanswered.
      try {
        const w = await fetch(`/api/projects/entity-warning?automation=${encodeURIComponent(automation)}`, { cache: "no-store" });
        if (w.ok) {
          const wd = (await w.json()) as { warnings?: unknown[] };
          if (wd.warnings?.length) return;
        }
      } catch { /* the warning check must never block the Quiz itself */ }
      const r = await fetch(`/api/projects/quiz?${query}`, { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { started: boolean; status?: string; phase?: Phase; hasCases?: boolean; reviewed?: boolean };
      // AUTO-OPEN = THE USE-CASE GATE ONLY (step 247, owner's complaint on automation-14; fix 2026-07-18): the
      // forced opening exists to make the owner describe his cases AND confirm them (step 231) — nothing else.
      // It keys off the REVIEW STATE, not the quiz phase: once cases exist and are approved, the page opens
      // nothing on its own, even after the develop agent built nodes (which leaves the quiz phase at
      // "usecases" and node_count at 0 — the bug that reopened this modal on every visit). A later edit stales
      // the review, so the gate returns on its own to ask for re-confirmation.
      if (!d.hasCases || !d.reviewed) setOpenState(true);
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
      if (!r.ok) { toast.error(d.error ?? L.errNoAnswer); return; }
      if (d.question) setTurns((t) => [...t, { role: "assistant", content: d.question as string }]);
    } finally { setBusy(false); }
  }, [answer, busy, subject, L]);

  const finish = useCallback(async () => {
    const r = await fetch(`/api/projects/quiz/finish`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subject()),
    });
    const d = (await r.json()) as { report?: string; canTest?: boolean };
    close();
    // THE GUARANTEE (227.C): the session never ends with nothing — the owner is told exactly where the
    // subject stands and (for a project) can run the smoke test right from the toast.
    toast.info(L.sessionFinished, {
      description: d.report,
      duration: 30000,
      action: isEdge || isCaseEdit || isEntity || !automation
        ? undefined
        : {
            label: L.testIt,
            onClick: () => {
              void (async () => {
                const t = await fetch(`/api/projects/test-run`, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ automation }),
                });
                const td = (await t.json()) as { ok?: boolean; verdict?: string; report?: string };
                (td.ok ? toast.success : toast.info)(td.verdict ?? L.testFinished, { description: td.report, duration: 20000 });
              })();
            },
          },
    });
    router.refresh();
  }, [subject, isEdge, isCaseEdit, automation, close, router, L]);

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
      if (!r.ok) { toast.error(d.error ?? L.errCasesNotReady, { duration: 12000 }); return; }
      setPhase("nodes");
      setTurns(d.question ? [{ role: "assistant", content: d.question }] : []);
      const n = d.cases?.length ?? 0;
      toast.success(n === 1 ? L.casesWrittenOne : fill(L.casesWritten, { n }), {
        description: L.casesWrittenDesc,
        duration: 15000,
      });
      router.refresh();
    } finally { setBusy(false); }
  }, [automation, router, L]);

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
        toast.error(d.error ?? L.errCreateNode, {
          duration: 15000,
          action: gated
            ? {
                label: L.openUserCases,
                onClick: () => window.dispatchEvent(new CustomEvent("usecases:review", { detail: { automation } })),
              }
            : undefined,
        });
        return;
      }
      setNodeCount(d.nodeCount ?? 0);
      // Step 233: a finished node is a DRAFT on the canvas — no per-node step. The single handoff is the
      // "Start development" button, which bundles all draft nodes into ONE step.
      toast.success(fill(L.nodeDesignedOnly, { name: d.node?.name ?? "" }), {
        description: L.nodeDesignedDesc,
        duration: 15000,
      });
      setTurns(d.question ? [{ role: "assistant", content: d.question }] : []);
      if (d.done) await finish();
      router.refresh();
    } finally { setBusy(false); }
  }, [automation, finish, router, L]);

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
      if (!r.ok) { toast.error(d.error ?? L.errWriteLink); return; }
      toast.success(fill(L.linkDesigned, { name: d.edge?.name ?? "", step: d.step?.number ?? 0 }), {
        description: L.handoffDesc,
        duration: 20000,
        action: d.step ? { label: L.copy, onClick: () => void navigator.clipboard.writeText(d.step!.message) } : undefined,
      });
      close();
      router.refresh();
    } finally { setBusy(false); }
  }, [edge, close, router, L]);

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
      if (!r.ok) { toast.error(d.error ?? L.errSaveCases); return; }
      const first = d.steps?.[0];
      const changed = d.changed ?? 0;
      (changed ? toast.success : toast.info)(
        changed ? (changed === 1 ? L.casesUpdatedOne : fill(L.casesUpdated, { n: changed })) : L.nothingChanged,
        {
          description: d.report,
          duration: 20000,
          action: first
            ? { label: L.copyStep, onClick: () => void navigator.clipboard.writeText(first.message) }
            : undefined,
        },
      );
      close();
      router.refresh();
    } finally { setBusy(false); }
  }, [subject, close, router, L]);

  // THE ENTITY's closing move (step 239): the brainstorm becomes this entity's REQUIREMENT TEXT, written into
  // its transport container — the very field the Requirement panel shows. NO development step is dispatched
  // here: the owner reviews the text, and dispatch is a separate action (the page-level wave, step 240).
  const applyEntity = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/quiz/entity-apply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation, entity }),
      });
      const d = (await r.json()) as { brief?: string; error?: string };
      if (!r.ok) { toast.error(d.error ?? L.errWriteLink); return; }
      onApplied?.(d.brief ?? "");
      toast.success(E.btnSaveRequirement, { description: E.hintEntity, duration: 15000 });
      close();
      router.refresh();
    } finally { setBusy(false); }
  }, [automation, entity, onApplied, close, router, L, E]);

  const pause = useCallback(() => { aborter?.abort(); setStreaming(false); }, [aborter]);

  const saveEdit = useCallback(async () => {
    if (!draftText.trim()) return;
    const asOwner = phase === "usecases" && !isEdge && !isCaseEdit && !isEntity; // keeping the draft IS his description
    setBusy(true);
    try {
      await fetch(`/api/projects/quiz/edit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...subject(), content: draftText, asOwner }),
      });
      setTurns((t) => [...t, { role: asOwner ? "user" : "assistant", content: draftText }]);
      setDraftText("");
      toast.success(asOwner ? L.keptAsDesc : L.editReplaced);
    } finally { setBusy(false); }
  }, [draftText, subject, phase, isEdge, isCaseEdit, L]);

  // "Keep this Quiz" (step 247, owner's two-button flow) — ONE exit: keep the streamed/edited draft as the
  // owner's description (when there is one), then finish the cases — exactly what the removed
  // "cases are ready" button did. Declared after saveEdit/applyUseCases (consts — TDZ).
  const keepQuiz = useCallback(async () => {
    if (draftText.trim()) await saveEdit();
    await applyUseCases();
  }, [draftText, saveEdit, applyUseCases]);

  // Leaving the use-case phase without cases is allowed (the owner may be interrupted), but it is never
  // silent: the automation cannot be built until they exist, and the Quiz reopens on the next visit.
  const onOpenChange = (v: boolean) => {
    if (v) { if (!controlled) setOpenState(true); return; }
    if (!isEdge && !isCaseEdit && !isEntity && phase === "usecases") {
      // Owner's request (step 243.2): the toast is not a dead end either — its own button reopens THIS
      // exact session (uncontrolled → its open state lives right here) instead of making him hunt for it.
      toast.warning(L.casesMissing, {
        description: L.casesMissingDesc,
        duration: 12000,
        action: { label: L.casesMissingAction, onClick: () => setOpenState(true) },
      });
    }
    close();
  };

  const title = isEntity ? (
    <>
      <Sparkles className="size-4" /> {E.tEntity}
      <span className="truncate text-xs font-normal text-muted-foreground">{entityName ?? entity ?? ""}</span>
    </>
  ) : isEdge ? (
    <>
      <Link2 className="size-4" /> {L.tLink}
      <span className="truncate text-xs font-normal text-muted-foreground">{edgeName ?? ""}</span>
    </>
  ) : isCaseEdit ? (
    <>
      <ListChecks className="size-4" /> {useCase ? L.tCaseOne : L.tCaseAll}
      <span className="truncate text-xs font-normal text-muted-foreground">{useCaseName ?? automation ?? ""}</span>
    </>
  ) : phase === "usecases" ? (
    <>
      <ListChecks className="size-4" /> {L.tUseCases}
      <span className="text-xs font-normal text-muted-foreground">{L.tUseCasesSub}</span>
    </>
  ) : (
    <>
      <MessagesSquare className="size-4" /> {L.tNode} {nodeCount + 1}
      <span className="text-xs font-normal text-muted-foreground">{L.tNodeOf} {maxNodes}</span>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* LAYOUT (owner: the microphone was cut off). DialogContent is a CSS grid that CLIPS rows under a
          max-height instead of shrinking them, so the bottom row — the field, the mic and the buttons —
          was never on screen. It is now THREE explicit regions with the padding moved per-region (p-0):
          a fixed HEADER, a single SCROLLING BODY (min-h-0 flex-1), and a fixed FOOTER that always holds
          the input, the microphone with its volume meter, and the actions. */}
      {/* FIXED height (owner: the modal must always be 600px). max-h was only a MAXIMUM, so with the body's
          absolute inner (no intrinsic height) the box collapsed to header+footer and flex-1 got ~nothing.
          A definite h-[600px] gives flex-col a real height to distribute; max-h-[92vh] only guards tiny
          screens. */}
      <DialogContent className="flex h-[600px] max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-6 pt-6 pb-3">
          <DialogTitle className="flex flex-wrap items-center gap-2">{title}</DialogTitle>
        </DialogHeader>

        {/* THE SCROLLING BODY — the banner and the whole transcript live here; on any screen it scrolls,
            so the footer below is never pushed off. The relative wrapper anchors the "scroll to newest"
            button, which stays put while the inner list scrolls under it. */}
        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollRef}
            onScroll={() => setShowScrollDown(!nearBottom())}
            // absolute inset-0 (not h-full): a percentage height inside a flex item does not constrain, so
            // the list distended and overlapped the footer. Filling the relative wrapper exactly restores the
            // scroll containment — the list scrolls inside its box and never covers the input.
            className="absolute inset-0 space-y-3 overflow-y-auto px-6 py-3"
          >
            {/* Owner's note: planning is where the model's strength shows most — a weak model designs a weak
                automation. The model is chosen in the automation menu (the hamburger, top right of the page). */}
            <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p>{L.banner}</p>
            </div>

            {turns.length === 0 && busy && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {isEdge ? L.loaderEdge : isCaseEdit || isEntity ? L.loaderCase : L.loaderInstruction}
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
                    <Sparkles className="size-3" /> {L.designer}
                  </p>
                )}
                <p className="whitespace-pre-wrap">{t.content}</p>
              </div>
            ))}
          </div>

          {/* SCROLL TO NEWEST (owner) — a gentle bouncing chevron, centred at the bottom of the transcript,
              shown only while there is content below the fold; click smooth-scrolls to the latest message. */}
          {showScrollDown && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="absolute bottom-2 left-1/2 flex size-8 -translate-x-1/2 animate-bounce items-center justify-center rounded-full border bg-background/90 text-foreground shadow-md backdrop-blur transition-colors hover:bg-muted"
              aria-label={L.scrollDown}
            >
              <ChevronDown className="size-4" />
            </button>
          )}
        </div>

        {/* AUTO-QUIZ (227.B): the model thinks out loud, streamed. The area stays EDITABLE — pause, rewrite,
            save; what gets built is then made from YOUR text. */}
        {(streaming || draftText) && (
          <div className="mx-6 max-h-[35vh] shrink-0 space-y-2 overflow-y-auto rounded-lg border border-primary/40 p-2">
            <p className="flex items-center gap-1 text-xs font-medium text-primary">
              <Sparkles className="size-3" /> {streaming ? L.autoWriting : L.autoPaused}
            </p>
            <Textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={7}
              className="text-sm"
            />
            {/* Step 247 (owner): the container's own Continue/Keep buttons are GONE — continuing and
                accepting live in the footer ("Continue auto" / "Keep this Quiz"). Only Pause remains,
                while streaming, because there is no other way to stop a stream mid-thought. */}
            {streaming && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={pause}>
                  <Pause className="size-3.5" /> {L.btnPause}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* THE FOOTER — always on screen (owner's requirement): the input, the microphone with its volume
            meter, and the actions. It never scrolls away; the body above scrolls instead. */}
        <div className="shrink-0 space-y-2 border-t px-6 pb-6 pt-3">
          <Textarea
            ref={answerRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            className="max-h-40 overflow-y-auto"
            placeholder={
              phase === "usecases" && !isEdge && !isCaseEdit && !isEntity ? L.phScenarios : L.phAnswer
            }
            disabled={busy || streaming}
          />
          {/* Voice (step 232) — the shared primitive, mounted on this field. Hold to speak; the transcript
              lands at the cursor, so a dictated afterthought can go into the middle of a sentence. */}
          <VoiceInput
            targetRef={answerRef}
            value={answer}
            onChange={setAnswer}
            disabled={busy || streaming}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={send} disabled={busy || streaming || !answer.trim()}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} {L.btnAnswer}
            </Button>
            {/* Step 247 (owner's two-button flow, use-cases phase): before the first Auto-quiz press —
                one "Auto-quiz" button; after it — "Continue auto-quiz" + "Keep this Quiz" (the ONE exit;
                the old "cases are ready" button is gone, keepQuiz performs its action). The READY pulse
                (247.8) now lives on "Keep this Quiz" — it IS the exit the pulse was pointing at. */}
            {!autoUsed || isEntity || isEdge || isCaseEdit || phase !== "usecases" ? (
              <Button size="sm" variant="secondary" onClick={autoQuiz} disabled={busy || streaming}>
                <Sparkles className="size-3.5" /> {L.btnAuto}
              </Button>
            ) : (
              <>
                <Button size="sm" variant="secondary" onClick={autoQuiz} disabled={busy || streaming}>
                  <Sparkles className="size-3.5" /> {L.btnContinue}
                </Button>
                <Button size="sm" variant="outline" onClick={keepQuiz} disabled={busy || streaming} className={readyPulse}>
                  <SkipForward className="size-3.5" /> {L.btnKeepQuiz}
                </Button>
              </>
            )}
            {isEntity ? (
              <Button size="sm" variant="outline" onClick={applyEntity} disabled={busy || streaming}>
                <SkipForward className="size-3.5" /> {E.btnSaveRequirement}
              </Button>
            ) : isEdge ? (
              <Button size="sm" variant="outline" onClick={applyEdge} disabled={busy || streaming}>
                <SkipForward className="size-3.5" /> {L.btnFinishLink}
              </Button>
            ) : isCaseEdit ? (
              <Button size="sm" variant="outline" onClick={applyCaseEdit} disabled={busy || streaming} className={readyPulse}>
                <SkipForward className="size-3.5" /> {L.btnSaveCases}
              </Button>
            ) : phase === "usecases" ? (
              /* The "cases are ready" button is REMOVED (owner): before Auto-quiz the exit is still
                 needed for a purely spoken/typed session — it shows ONLY until the first Auto-quiz press,
                 after which "Keep this Quiz" is the one exit. */
              !autoUsed ? (
                <Button size="sm" variant="outline" onClick={applyUseCases} disabled={busy || streaming} className={readyPulse}>
                  <SkipForward className="size-3.5" /> {L.btnCasesReady}
                </Button>
              ) : null
            ) : (
              <Button size="sm" variant="outline" onClick={nextNode} disabled={busy || streaming}>
                <SkipForward className="size-3.5" /> {L.btnFinishNode}
              </Button>
            )}
            {!(phase === "usecases" && !isEdge && !isCaseEdit && !isEntity) && (
              <Button size="sm" variant="ghost" onClick={finish} disabled={busy || streaming}>
                {L.btnEnd}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isEntity ? E.hintEntity : isEdge ? L.hintLink : isCaseEdit ? L.hintCase : phase === "usecases" ? L.hintUsecases : L.hintNodes}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
