"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2, Pencil, Plus, Settings2, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
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

// ПАНЕЛЬ ПОЛЬЗОВАТЕЛЬСКИХ КЕЙСОВ — ДЕВ-СЛОЙ (`_shared-v2`, шаг 298). Три режима (замысел владельца 2026-07-24):
//
//   initial  — ЛЁГКИЙ слой: кейсы read-only (номер + заголовок + статус + описание) и одна обычная кнопка
//              «Настроить / добавить пользовательские кейсы». Никакого тяжёлого интерактива.
//   settings — по кнопке верх исчезает и рисуется ПОЛНЫЙ интерактив (добавить / удалить / карандаши), плюс
//              «Подтвердить» (→ review) и «Готово» (→ initial).
//   review   — режим настройки убирается, открывается подтверждение набора: владелец перечитывает кейсы и
//              подтверждает. Подтвердил → назад в initial, и в полосе уведомлений появляется «можно
//              запускать разработку» (полоса пересчитывается сама после `router.refresh()`).
//
// Источник кейсов — ЯДРО автоматизации (`automation.json`): двери v2 `api/core` / `api/patch` относительным
// путём от страницы. Ревью-гейт выведен из ядра через подпись (`reviewedSignature`): любая правка набора
// расходит подпись → «подтверждено» гаснет (правило шага 231, без серверного флага v1).
//
// AI-Quiz (описание сценариев голосом → автоквиз-стрим → синтез в кейсы) — отдельный слой генерации, его
// движок уже перенесён в этот микросервис (`server/`), карандаши подключатся к нему следующим шагом; пока
// карандаш показывает подсказку `quizSoon`. Добавление, удаление и ревью работают на ядре уже сейчас.

/** {title} → значение — крохотная замена v1 `fill()`, чтобы не тянуть quiz-i18n из v1. */
const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
/** Двери ЭТОЙ автоматизации: тот же приём, что у «Строить вместе с ИИ» — база от адреса страницы. */
const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";

type Mode = "initial" | "settings" | "review";

export function UseCasesPanel() {
  const router = useRouter();
  const lang = useUiLang();
  const L = useCasesStrings(lang);
  const [mode, setMode] = useState<Mode>("initial");
  const [rows, setRows] = useState<UseCase[]>([]);
  const [reviewedSignature, setReviewedSignature] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<UseCase | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addSummary, setAddSummary] = useState("");
  const addTitleRef = useRef<HTMLInputElement | null>(null);
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

  // The Quiz (and other flows) can jump the owner straight to confirmation — that dispatches this event.
  useEffect(() => {
    const onAsk = () => setMode("review");
    window.addEventListener("usecases:review", onAsk);
    return () => window.removeEventListener("usecases:review", onAsk);
  }, []);

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
      await load();
      setMode("initial");
      // Серверные данные перечитываются — полоса уведомлений пересчитает поводы и покажет «можно запускать
      // разработку» БЕЗ перезагрузки страницы.
      router.refresh();
    } finally { setBusy(false); }
  }, [rows, load, router, L]);

  // Карандаш (Quiz) — движок уже в микросервисе, подключение карандашей к нему следующим шагом.
  const editSoon = () => toast.info(L.quizSoon);

  // Read-only список кейсов — общий для initial и review; крупный номер, заголовок, цветной статус, описание.
  const caseList = (
    <Accordion type="single" collapsible defaultValue={rows[0]?.id} className="rounded-lg border px-4">
      {rows.map((c, i) => {
        const st = STATUS_META[c.status] ?? STATUS_META["new"];
        return (
          <AccordionItem key={c.id} value={c.id}>
            <AccordionTrigger className="text-left">
              <span className="flex items-center gap-3">
                <span className="text-2xl font-bold tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st.className}`}>{st.label}</span>
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm leading-relaxed text-muted-foreground">{c.summary || L.noDescription}</p>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );

  // ── INITIAL — лёгкий слой: только тексты кейсов + человеческая кнопка входа в настройку. ─────────────────
  if (mode === "initial") {
    return (
      <div className="space-y-3">
        {rows.length ? caseList : <p className="text-sm text-muted-foreground">{L.empty}</p>}
        <Button variant="secondary" onClick={() => setMode("settings")}>
          <Settings2 className="size-4" /> {L.configureCases}
        </Button>
      </div>
    );
  }

  // ── REVIEW — режим настройки убран, владелец перечитывает набор и подтверждает. ──────────────────────────
  if (mode === "review") {
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-sm font-medium"><CheckCheck className="size-4" /> {L.reviewTitle}</p>
        <p className="text-sm text-muted-foreground">{L.reviewIntro}</p>
        <div className="space-y-3">
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
        <div className="flex justify-end gap-2 border-t pt-3">
          <Button variant="ghost" onClick={() => setMode("settings")} disabled={busy}>{L.notYet}</Button>
          <Button onClick={confirmReview} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />} {L.confirmBtn}
          </Button>
        </div>
      </div>
    );
  }

  // ── SETTINGS — полный интерактив: добавить / удалить / карандаши, плюс «Подтвердить» и «Готово». ──────────
  return (
    <div className="space-y-3">
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
          <Button size="sm" variant="ghost" onClick={() => setAddOpen(true)}>
            <Plus className="size-3.5" /> {L.addCase}
          </Button>
          <Button size="sm" variant="ghost" title={L.editAllTip} onClick={editSoon}>
            <Pencil className="size-3.5" /> {L.editAll}
          </Button>
        </span>
      </div>

      {rows.length ? (
        <Accordion type="single" collapsible defaultValue={rows[0]?.id} className="rounded-lg border px-4">
          {rows.map((c, i) => {
            const st = STATUS_META[c.status] ?? STATUS_META["new"];
            return (
              <AccordionItem key={c.id} value={c.id}>
                <div className="flex items-center justify-between gap-2">
                  <AccordionTrigger className="flex-1 text-left">
                    <span className="flex items-center gap-3">
                      <span className="text-2xl font-bold tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{c.title}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st.className}`}>{st.label}</span>
                      </span>
                    </span>
                  </AccordionTrigger>
                  <span className="ml-auto flex shrink-0 items-center gap-0.5">
                    <Button size="icon" variant="ghost" className="size-8" title={L.editCaseTip} onClick={editSoon}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-8 text-destructive" title={L.deleteTip} onClick={() => setConfirmDelete(c)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </span>
                </div>
                <AccordionContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">{c.summary || L.noDescription}</p>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : (
        <p className="text-sm text-muted-foreground">{L.empty}</p>
      )}

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="ghost" onClick={() => setMode("initial")} disabled={busy}>{L.doneConfig}</Button>
        <Button variant="secondary" onClick={() => setMode("review")} disabled={busy || !rows.length}>
          <CheckCheck className="size-4" /> {L.readConfirm}
        </Button>
      </div>

      {/* ADD ONE CASE — прямой путь (title + описание, голос). */}
      <Dialog open={addOpen} onOpenChange={(v) => { if (!busy) setAddOpen(v); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="size-4" /> {L.addCaseTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{L.addCaseIntro}</p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{L.addCaseTitleLabel}</label>
              <Input ref={addTitleRef} value={addTitle} onChange={(e) => setAddTitle(e.target.value)} />
              <VoiceInput targetRef={addTitleRef} value={addTitle} onChange={setAddTitle} lang={lang} disabled={busy} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{L.addCaseSummaryLabel}</label>
              <Textarea ref={addSummaryRef} value={addSummary} onChange={(e) => setAddSummary(e.target.value)} rows={5} className="text-sm" />
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

      {/* Delete — always confirmed (owner's rule). */}
      <Dialog open={Boolean(confirmDelete)} onOpenChange={(v) => { if (!v) setConfirmDelete(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{L.deleteTitle}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{fill(L.deleteBody, { title: confirmDelete?.title ?? "" })}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)} disabled={busy}>{L.cancel}</Button>
            <Button variant="destructive" onClick={remove} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} {L.del}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
