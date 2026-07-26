"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCheck, Loader2, Pencil, Plus, Rocket, ShieldAlert, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
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
import { CreateQuiz } from "./create-quiz.client";

// ПАНЕЛЬ ПОЛЬЗОВАТЕЛЬСКИХ КЕЙСОВ — ДЕВ-СЛОЙ (`_shared-v2`). ЛИНЕЙНЫЙ ПОТОК опиши → подтверди → запусти
// (шаг 301, лечение «скрытого гейта»: раньше подтверждение пряталось за двумя кликами, а после него панель
// сворачивалась и запуск был только в верхней полосе — владелец не понимал, что делать дальше).
//
// Панель ВСЕГДА показывает текущий шаг и его единственное следующее действие; она выводится по ДВУМ фактам
// из ядра — есть ли кейсы и подтверждён ли набор (`reviewed` = подпись набора совпала с `reviewedSignature`):
//
//   нет кейсов                 → приглашение: собрать через Quiz / добавить руками.
//   кейсы есть, mode="edit"    → правка: добавить/удалить/карандаш + основная «Готово — к подтверждению».
//   кейсы есть, НЕ подтверждены→ ОРАНЖЕВЫЙ экран подтверждения: read-only список + «Прочитать и подтвердить»
//                                / «Вернуться к редактированию». Открывается САМ после Quiz.
//   кейсы подтверждены         → ЗЕЛЁНЫЙ экран: «можно запускать» + кнопка «Запустить разработку» ПРЯМО ЗДЕСЬ
//                                (то же событие, что и верхняя полоса) + «Изменить кейсы».
//
// Любая правка набора расходит подпись → «подтверждено» гаснет (правило шага 231, без серверного флага v1).
// Ревью-гейт и данные — из ядра (`api/core`/`api/patch` относительным путём от страницы).

/** {title} → значение — крохотная замена v1 `fill()`. */
const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
/** Двери ЭТОЙ автоматизации: база от адреса страницы (папка самодостаточна, знает себя только по URL). */
const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";
/** Адрес автоматизации из URL — для события запуска разработки (то же, что делает полоса-уведомление). */
function automationFromPath(): string {
  if (typeof window === "undefined") return "";
  const p = window.location.pathname.split("?")[0].split("/").filter(Boolean);
  return p.length >= 3 && p[0] === "projects" ? `${p[1]}/${p[2]}` : "";
}

// Две поверхности панели: обычный ВИД (по факту подтверждения — оранжевый или зелёный) и РЕДАКТИРОВАНИЕ.
type Mode = "view" | "edit";

export function UseCasesPanel() {
  const router = useRouter();
  const lang = useUiLang();
  const L = useCasesStrings(lang);
  const [mode, setMode] = useState<Mode>("view");
  const [quizOpen, setQuizOpen] = useState(false);
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

  // Полоса-уведомление при клике по заблокированному запуску просит открыть подтверждение — показываем ВИД
  // (там оранжевый экран, если набор не подтверждён).
  useEffect(() => {
    const onAsk = () => setMode("view");
    window.addEventListener("usecases:review", onAsk);
    return () => window.removeEventListener("usecases:review", onAsk);
  }, []);

  /** Запуск разработки прямо из секции — то же событие, что шлёт верхняя полоса; ловит его провайдер зоны. */
  const launch = useCallback(() => {
    const a = automationFromPath();
    if (a) window.dispatchEvent(new CustomEvent("fractera:launch-development", { detail: { automation: a } }));
  }, []);

  const addCase = useCallback(async () => {
    if (!addTitle.trim() || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`${apiBase()}/patch`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "append", object: "useCases", value: { title: addTitle.trim(), text: addSummary.trim() || addTitle.trim(), status: "new" } }),
      });
      if (!r.ok) { toast.error(L.addCaseFail); return; }
      toast.success(L.addedTitle, { description: L.addedDesc });
      setAddOpen(false); setAddTitle(""); setAddSummary("");
      await load();
      setMode("edit"); // остаёмся в правке — владелец может добавить ещё; «Готово» уведёт к подтверждению
      window.dispatchEvent(new CustomEvent("fractera:notices-refresh"));
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
      window.dispatchEvent(new CustomEvent("fractera:notices-refresh"));
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
      setMode("view"); // reviewed=true → отрисуется ЗЕЛЁНЫЙ экран с кнопкой запуска
      window.dispatchEvent(new CustomEvent("fractera:notices-refresh"));
      router.refresh();
    } finally { setBusy(false); }
  }, [rows, load, router, L]);

  // Карандаш (Quiz-на-один-кейс) — движок в микросервисе, подключение следующим шагом.
  const editSoon = () => toast.info(L.quizSoon);

  // Read-only список кейсов — для оранжевого экрана подтверждения.
  const readOnlyList = (
    <div className="space-y-2">
      {rows.map((c, i) => (
        <div key={c.id} className="rounded-lg border bg-background/60 p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <span className="tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
            {c.title}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{c.summary || L.noDescription}</p>
        </div>
      ))}
    </div>
  );

  // ── СОДЕРЖИМОЕ по состоянию. Диалоги (добавить/удалить/Quiz) монтируются ниже ОДИН раз для всех веток. ──
  let content: ReactNode;

  if (rows.length === 0) {
    // ПУСТО — приглашение описать кейсы.
    content = (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{L.empty}</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setQuizOpen(true)}><Sparkles className="size-4" /> {L.createCases}</Button>
          <Button variant="secondary" onClick={() => setAddOpen(true)}><Plus className="size-4" /> {L.addFirstCase}</Button>
        </div>
      </div>
    );
  } else if (mode === "edit") {
    // ПРАВКА — полный интерактив + основная «Готово — к подтверждению».
    content = (
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
            <Button size="sm" variant="ghost" onClick={() => setAddOpen(true)}><Plus className="size-3.5" /> {L.addCase}</Button>
            <Button size="sm" variant="ghost" title={L.editAllTip} onClick={() => setQuizOpen(true)}><Sparkles className="size-3.5" /> {L.editAll}</Button>
          </span>
        </div>

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
                    <Button size="icon" variant="ghost" className="size-8" title={L.editCaseTip} onClick={editSoon}><Pencil className="size-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="size-8 text-destructive" title={L.deleteTip} onClick={() => setConfirmDelete(c)}><Trash2 className="size-3.5" /></Button>
                  </span>
                </div>
                <AccordionContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">{c.summary || L.noDescription}</p>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <div className="flex justify-end border-t pt-3">
          <Button onClick={() => setMode("view")} disabled={busy || !rows.length}>
            <CheckCheck className="size-4" /> {L.doneToConfirm}
          </Button>
        </div>
      </div>
    );
  } else if (reviewed) {
    // ЗЕЛЁНЫЙ — подтверждено, можно запускать разработку ПРЯМО ОТСЮДА.
    content = (
      <div className="space-y-3 rounded-xl border border-emerald-500/50 bg-emerald-500/5 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          <ShieldCheck className="size-4" /> {L.confirmedScreenTitle}
        </p>
        <p className="text-sm text-muted-foreground">{L.confirmedScreenBody}</p>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-emerald-500/20 pt-3">
          <Button variant="ghost" size="sm" onClick={() => setMode("edit")} disabled={busy}>
            <Pencil className="size-3.5" /> {L.editCases}
          </Button>
          <Button onClick={launch} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
            <Rocket className="size-4" /> {L.launchDevelopment}
          </Button>
        </div>
      </div>
    );
  } else {
    // ОРАНЖЕВЫЙ — есть кейсы, не подтверждены: перечитать и подтвердить (или назад в правку).
    content = (
      <div className="space-y-3 rounded-xl border border-amber-500/50 bg-amber-500/5 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
          <ShieldAlert className="size-4" /> {L.confirmScreenTitle}
        </p>
        <p className="text-sm text-muted-foreground">{L.confirmScreenIntro}</p>
        {readOnlyList}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-500/20 pt-3">
          <Button variant="ghost" size="sm" onClick={() => setMode("edit")} disabled={busy}>
            <ArrowLeft className="size-3.5" /> {L.backToEditing}
          </Button>
          <Button onClick={confirmReview} disabled={busy} className="gap-2 bg-amber-600 text-white hover:bg-amber-700">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />} {L.readConfirm}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {content}

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

      {/* СОЗДАНИЕ КЕЙСОВ С ИИ — Quiz. Применил кейсы → перезагрузка + ВИД (оранжевый экран подтверждения). */}
      <CreateQuiz open={quizOpen} lang={lang} onClose={() => setQuizOpen(false)} onApplied={async () => { await load(); setMode("view"); }} />
    </div>
  );
}
