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
import VoiceInput from "../../../tools/voice-input/client/voice-input.client";
import { useUiLang } from "../../../use-ui-lang";
import type { UseCase } from "../types/use-cases";
import { STATUS_META } from "../types/use-cases";
import { useCasesStrings } from "./use-cases-i18n";
import { signatureOf } from "./signature";

// ПАНЕЛЬ ПОЛЬЗОВАТЕЛЬСКИХ КЕЙСОВ — ДЕВ-СЛОЙ (`_shared-v2`, шаг 298). Перенос v1
// `_shared/components/use-cases-panel.client.tsx` ОДИН-К-ОДНОМУ по виду; изменилась ТОЛЬКО привязка к
// дверям — вместо платформенного `/api/projects/use-cases` панель бьёт в СВОИ двери автоматизации
// (`api/core` / `api/patch`) относительным путём от `location.pathname`, как это делает «Строить вместе с
// ИИ». Кейсы — первая стадия автоматизации и точка согласия с ИИ; поэтому это инструмент РАЗРАБОТКИ и живёт
// в мягком слое: нет `_shared-v2` — панель не появляется, продакшн не задет (закон устойчивости).
//
// ВЛОЖЕННЫЙ АККОРДЕОН, один пункт на кейс: крупный номер (01, 02, …), заголовок, цветной бейдж статуса,
// описание. Карандаш на заголовке / на кейсе (массовое редактирование через Quiz) — ОТДЕЛЬНЫЙ будущий шаг:
// пока карандаш показывает подсказку `quizSoon`. Добавление, удаление и ревью-гейт работают полностью.
//
// РЕВЬЮ-ГЕЙТ выведен ИЗ ЯДРА (шаг 298): «подтверждено» = подпись текущего набора (`signatureOf`) совпала с
// `useCases.reviewedSignature` в ядре. Любая правка набора расходит подпись — владельца просят подтвердить
// заново (правило шага 231, но без серверного флага v1).

/** {title} → значение — крохотная замена v1 `fill()`, чтобы не тянуть quiz-i18n из v1. */
const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");

/** Двери ЭТОЙ автоматизации: тот же приём, что у «Строить вместе с ИИ» — база от адреса страницы. */
const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";

export function UseCasesPanel() {
  const router = useRouter();
  const lang = useUiLang();
  const L = useCasesStrings(lang);
  const [rows, setRows] = useState<UseCase[]>([]);
  const [reviewedSignature, setReviewedSignature] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<UseCase | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  // ADD ONE CASE (step 247, owner's find): a small form — title + free-form summary, voice via the ONE
  // VoiceInput primitive. `op:"append"` on the core; the review stales by itself (the signature moves).
  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addSummary, setAddSummary] = useState("");
  const addSummaryRef = useRef<HTMLTextAreaElement | null>(null);

  // «Подтверждено» — производная: набор непуст И его подпись совпадает с записанной в ядре.
  const reviewed = rows.length > 0 && signatureOf(rows) === reviewedSignature;

  const load = useCallback(async () => {
    const r = await fetch(`${apiBase()}/core?select=useCases`, { cache: "no-store" });
    if (!r.ok) return;
    const d = (await r.json()) as {
      cases?: { cuid: string; title: string; text: string; status: string }[];
      reviewedSignature?: string;
    };
    if (d.cases) {
      setRows(d.cases.map((c) => ({ id: c.cuid, title: c.title, summary: c.text, status: c.status as UseCase["status"] })));
    }
    setReviewedSignature(d.reviewedSignature ?? "");
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Declared AFTER `load` — it closes over it (a const; referencing it earlier is a build error).
  const addCase = useCallback(async () => {
    if (!addTitle.trim() || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`${apiBase()}/patch`, {
        method: "POST", headers: { "content-type": "application/json" },
        // Ядро требует непустой `text`: если владелец не описал сценарий, берём заголовок как минимум.
        body: JSON.stringify({ op: "append", object: "useCases", value: { title: addTitle.trim(), text: addSummary.trim() || addTitle.trim(), status: "new" } }),
      });
      if (!r.ok) { toast.error(L.addCaseFail); return; }
      toast.success(L.addedTitle, { description: L.addedDesc });
      setAddOpen(false); setAddTitle(""); setAddSummary("");
      await load();
      router.refresh();
    } finally { setBusy(false); }
  }, [addTitle, addSummary, busy, load, router, L]);

  // The Quiz (and the Builder) refuse a development step until the cases are confirmed, and tell the owner
  // to come here. That refusal dispatches this event — we open the review dialog for him.
  useEffect(() => {
    const onAsk = () => setReviewOpen(true);
    window.addEventListener("usecases:review", onAsk);
    return () => window.removeEventListener("usecases:review", onAsk);
  }, []);

  const remove = useCallback(async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      const r = await fetch(`${apiBase()}/patch`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "delete", address: { object: "useCase", cuid: confirmDelete.id } }),
      });
      if (!r.ok) { toast.error(L.deleteFail); return; }
      toast.success(L.deletedTitle, { description: L.deletedDesc });
      setConfirmDelete(null);
      await load();
      router.refresh();
    } finally { setBusy(false); }
  }, [confirmDelete, load, router, L]);

  const confirmReview = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch(`${apiBase()}/patch`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: { object: "useCases" }, set: { reviewedSignature: signatureOf(rows) } }),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) { toast.error(d.error ?? L.confirmFail); return; }
      toast.success(L.confirmedTitle, { description: L.confirmedDesc });
      setReviewOpen(false);
      await load();
      router.refresh();
    } finally { setBusy(false); }
  }, [rows, load, router, L]);

  // Карандаш (Quiz) — отдельный будущий шаг; пока честная подсказка вместо тихого «ничего не происходит».
  const editSoon = () => toast.info(L.quizSoon);

  if (!rows.length) {
    // Owner's request (step 243.2): the empty state offers a way to actually start here. The Quiz is a
    // later step, so this opens the direct "add one case" form (which already works).
    return (
      <section data-usecases className="space-y-3 rounded-lg border px-4 py-3">
        <h3 className="text-sm font-semibold capitalize" title={L.sectionTooltip}>{L.sectionTitle}</h3>
        <p className="text-sm text-muted-foreground">{L.empty}</p>
        <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
          <Sparkles className="size-3.5" /> {L.createCases}
        </Button>
        {addDialog()}
      </section>
    );
  }

  return (
    <section data-usecases className="space-y-3 rounded-lg border px-4 py-3">
      <h3 className="text-sm font-semibold capitalize" title={L.sectionTooltip}>{L.sectionTitle}</h3>
      {/* The header row: the review state of the whole set + add + the (deferred) whole-set pencil. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`flex items-center gap-1.5 text-xs font-medium ${
            reviewed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
          }`}
        >
          {reviewed ? <ShieldCheck className="size-4" /> : <ShieldAlert className="size-4" />}
          {reviewed ? L.reviewedYes : L.reviewedNo}
        </span>
        <span className="flex items-center gap-1">
          {!reviewed && (
            <Button size="sm" variant="secondary" onClick={() => setReviewOpen(true)}>
              <CheckCheck className="size-3.5" /> {L.readConfirm}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setAddOpen(true)}>
            <Plus className="size-3.5" /> {L.addCase}
          </Button>
          <Button size="sm" variant="ghost" title={L.editAllTip} onClick={editSoon}>
            <Pencil className="size-3.5" /> {L.editAll}
          </Button>
        </span>
      </div>

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
                <span className="ml-auto flex shrink-0 items-center gap-0.5">
                  <Button size="icon" variant="ghost" className="size-8" title={L.editCaseTip} onClick={editSoon}>
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

      {addDialog()}

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
        {/* A flex column: only the list scrolls, so the confirm button is never clipped off the bottom of
            the screen when the automation has many cases. */}
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
    </section>
  );

  // ADD ONE CASE (step 247) — the direct path; used by both the empty state and the header. Declared as a
  // closure so the empty-state early-return and the full panel render THE SAME dialog, verbatim.
  function addDialog() {
    return (
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
              <VoiceInput targetRef={addSummaryRef} value={addSummary} onChange={setAddSummary} lang={lang} disabled={busy} />
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
    );
  }
}
