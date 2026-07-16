"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2, Pencil, Plus, ShieldAlert, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { UseCase } from "../use-cases";
import { STATUS_META } from "../use-cases";
import { ActivationQuiz } from "./activation-quiz.client";
import { VoiceInput } from "./voice-input.client";
import { useUiLang } from "../use-ui-lang";
import { useCasesStrings } from "../use-cases-i18n";
import { fill } from "../quiz-i18n";

// FROZEN STANDARD — the Use cases panel (step 222; made LIVE and editable in step 231).
//
// A nested accordion, one item per case: a big number (01, 02, …) so the owner can refer to a case by number,
// its title, a colored status badge, and its description.
//
// STEP 231 — the cases are the automation's FIRST stage and its agreement point with the AI:
//   • the PENCIL on the header → the Quiz walks the whole set again (each case in turn, plus any new one),
//   • the PENCIL on a case     → the same Quiz, scoped to that case,
//   • the TRASH on a case      → delete, with a confirmation,
//   • "I read them"            → THE REVIEW GATE: no development step is created (Quiz "next node", Builder
//     "Start development") until the owner confirms he read the cases and the AI understood him. Editing,
//     adding or deleting a case stales that confirmation — he is asked again.
// Every edit ends the way a node does: ONE development step per changed case, in the existing file queue.
//
// The cases come from the live store (/api/projects/use-cases); the `cases` prop (the project's generated
// _data/use-cases.ts) is the initial paint, so the page still renders them server-side and without JS.
type Review = { reviewed: boolean; hasCases: boolean; reviewedAt: string | null };

export function UseCasesPanel({ cases, automation }: { cases: UseCase[]; automation?: string }) {
  const router = useRouter();
  const L = useCasesStrings(useUiLang());
  const [rows, setRows] = useState<UseCase[]>(cases);
  const [review, setReview] = useState<Review>({ reviewed: false, hasCases: cases.length > 0, reviewedAt: null });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ cuid?: string; title?: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UseCase | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  // ADD ONE CASE (step 247, owner's find: the panel had edit and delete but NO direct add — the only path
  // was the whole-set Quiz behind the header pencil). A small form: title + free-form summary, voice via
  // the ONE VoiceInput primitive. POST without cuid = add (the existing API); the review stales by itself.
  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addSummary, setAddSummary] = useState("");
  const addSummaryRef = useRef<HTMLTextAreaElement | null>(null);

  const addCase = useCallback(async () => {
    if (!automation || !addTitle.trim() || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/use-cases`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation, title: addTitle.trim(), summary: addSummary.trim() || undefined }),
      });
      if (!r.ok) { toast.error(L.addCaseFail); return; }
      toast.success(L.addedTitle, { description: L.addedDesc });
      setAddOpen(false); setAddTitle(""); setAddSummary("");
      await load();
      router.refresh();
    } finally { setBusy(false); }
  }, [automation, addTitle, addSummary, busy, load, router, L]);

  const load = useCallback(async () => {
    if (!automation) return;
    const r = await fetch(`/api/projects/use-cases?automation=${encodeURIComponent(automation)}`, { cache: "no-store" });
    if (!r.ok) return;
    const d = (await r.json()) as {
      cases?: { cuid: string; title: string; summary: string; status: string }[];
      review?: Review;
    };
    if (d.cases) {
      setRows(d.cases.map((c) => ({ id: c.cuid, title: c.title, summary: c.summary, status: c.status as UseCase["status"] })));
    }
    if (d.review) setReview(d.review);
  }, [automation]);

  useEffect(() => { void load(); }, [load]);

  // The Quiz (and the Builder) refuse a development step until the cases are confirmed, and tell the owner to
  // come here. That refusal dispatches this event — we open the review dialog for him.
  useEffect(() => {
    const onAsk = (e: Event) => {
      const d = (e as CustomEvent).detail as { automation?: string } | undefined;
      if (d?.automation && automation && d.automation !== automation) return;
      setReviewOpen(true);
    };
    window.addEventListener("usecases:review", onAsk);
    return () => window.removeEventListener("usecases:review", onAsk);
  }, [automation]);

  const remove = useCallback(async () => {
    if (!automation || !confirmDelete) return;
    setBusy(true);
    try {
      const r = await fetch(
        `/api/projects/use-cases?automation=${encodeURIComponent(automation)}&cuid=${encodeURIComponent(confirmDelete.id)}`,
        { method: "DELETE" },
      );
      if (!r.ok) { toast.error(L.deleteFail); return; }
      toast.success(L.deletedTitle, { description: L.deletedDesc });
      setConfirmDelete(null);
      await load();
      router.refresh();
    } finally { setBusy(false); }
  }, [automation, confirmDelete, load, router]);

  const confirmReview = useCallback(async () => {
    if (!automation) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/use-cases/review`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation }),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) { toast.error(d.error ?? L.confirmFail); return; }
      toast.success(L.confirmedTitle, { description: L.confirmedDesc });
      setReviewOpen(false);
      await load();
      router.refresh();
    } finally { setBusy(false); }
  }, [automation, load, router]);

  if (!rows.length) {
    // Owner's request (step 243.2): the empty state used to just SAY "describe them in the Quiz on this
    // page" without a way to actually open it here — now it does, the exact same session the header pencil
    // opens once cases exist ("cases: true" — revisit/create the whole set).
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{L.empty}</p>
        {automation && (
          <Button size="sm" variant="secondary" onClick={() => setEditing({})}>
            <Sparkles className="size-3.5" /> {L.createCases}
          </Button>
        )}
        {editing && automation && (
          <ActivationQuiz
            automation={automation}
            useCase={editing.cuid}
            useCaseName={editing.title}
            cases={!editing.cuid}
            open
            onClose={() => { setEditing(null); void load(); }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* The header row: the review state of the whole set + the pencil that revisits every case. */}
      {automation && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`flex items-center gap-1.5 text-xs font-medium ${
              review.reviewed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
            }`}
          >
            {review.reviewed ? <ShieldCheck className="size-4" /> : <ShieldAlert className="size-4" />}
            {review.reviewed ? L.reviewedYes : L.reviewedNo}
          </span>
          <span className="flex items-center gap-1">
            {!review.reviewed && (
              <Button size="sm" variant="secondary" onClick={() => setReviewOpen(true)}>
                <CheckCheck className="size-3.5" /> {L.readConfirm}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setAddOpen(true)}>
              <Plus className="size-3.5" /> {L.addCase}
            </Button>
            <Button size="sm" variant="ghost" title={L.editAllTip} onClick={() => setEditing({})}>
              <Pencil className="size-3.5" /> {L.editAll}
            </Button>
          </span>
        </div>
      )}

      <Accordion type="single" collapsible defaultValue={rows[0]?.id} className="rounded-lg border px-4">
        {rows.map((c, i) => {
          const st = STATUS_META[c.status] ?? STATUS_META["new"];
          return (
            <AccordionItem key={c.id} value={c.id}>
              {/* Owner: the pencil + trash sit in the RIGHT corner (justify-between / outer-edge alignment). */}
              <div className="flex items-center justify-between gap-2">
                <AccordionTrigger className="flex-1 text-left">
                  <span className="flex items-center gap-3">
                    <span className="text-2xl font-bold tabular-nums text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{c.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st.className}`}>
                        {st.label}
                      </span>
                    </span>
                  </span>
                </AccordionTrigger>
                {automation && (
                  <span className="ml-auto flex shrink-0 items-center gap-0.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      title={L.editCaseTip}
                      onClick={() => setEditing({ cuid: c.id, title: c.title })}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-destructive"
                      title={L.deleteTip}
                      onClick={() => setConfirmDelete(c)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </span>
                )}
              </div>
              <AccordionContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {c.summary || L.noDescription}
                </p>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* The pencil sessions — the SAME Quiz, with the case (or the whole set) as its subject. */}
      {editing && automation && (
        <ActivationQuiz
          automation={automation}
          useCase={editing.cuid}
          useCaseName={editing.title}
          cases={!editing.cuid}
          open
          onClose={() => { setEditing(null); void load(); }}
        />
      )}

      {/* ADD ONE CASE (step 247) — the direct path the panel was missing. */}
      <Dialog open={addOpen} onOpenChange={(v) => { if (!busy) setAddOpen(v); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-4" /> {L.addCaseTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{L.addCaseIntro}</p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{L.addCaseTitleLabel}</label>
              <Input value={addTitle} onChange={(e) => setAddTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{L.addCaseSummaryLabel}</label>
              <Textarea
                ref={addSummaryRef}
                value={addSummary}
                onChange={(e) => setAddSummary(e.target.value)}
                rows={5}
                className="text-sm"
              />
              <VoiceInput targetRef={addSummaryRef} value={addSummary} onChange={setAddSummary} disabled={busy} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={busy}>{L.cancel}</Button>
            <Button onClick={addCase} disabled={busy || !addTitle.trim()} className="gap-2">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} {L.addCaseSave}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete — always confirmed (owner's rule). */}
      <Dialog open={Boolean(confirmDelete)} onOpenChange={(v) => { if (!v) setConfirmDelete(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{L.deleteTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {fill(L.deleteBody, { title: confirmDelete?.title ?? "" })}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)} disabled={busy}>{L.cancel}</Button>
            <Button variant="destructive" onClick={remove} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} {L.del}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* THE REVIEW GATE — the owner reads the cases back and confirms that the AI understood him. */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        {/* A flex column, like the Quiz: only the list scrolls, so the confirm button is never clipped off
            the bottom of the screen when the automation has many cases (DialogContent is a grid — with a
            max-height it CLIPS rows instead of shrinking them). */}
        <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-2xl">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <CheckCheck className="size-4" /> {L.reviewTitle}
            </DialogTitle>
          </DialogHeader>
          <p className="shrink-0 text-sm text-muted-foreground">{L.reviewIntro}</p>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {rows.map((c, i) => (
              <div key={c.id} className="rounded-lg border p-3">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className="tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  {c.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{c.summary || L.noDescription}</p>
              </div>
            ))}
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t pt-3">
            <Button variant="ghost" onClick={() => setReviewOpen(false)} disabled={busy}>{L.notYet}</Button>
            <Button onClick={confirmReview} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
              {L.confirmBtn}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
