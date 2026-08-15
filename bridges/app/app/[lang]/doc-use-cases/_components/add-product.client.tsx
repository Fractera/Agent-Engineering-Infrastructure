"use client";

// Завести ВТОРОЙ продукт (партия 5, владелец 2026-08-15).
//
// 🔒 ВТОРОЙ ПРОДУКТ НАЧИНАЕТСЯ ТАК ЖЕ, КАК ПЕРВЫЙ: выбор структуры из тех же
// двенадцати, те же её семь вопросов, свои кейсы. Другого пути нет и не должно
// быть — иначе у владельца появилось бы два разных опыта для одного действия, и
// второй продукт вышел бы описанным хуже первого.
//
// 🔒 ОТЛИЧИЕ ОТ ВЫБОРА НА ПЕРВОМ ЭКРАНЕ — ОДНО ПОЛЕ `newProduct`. Без него запрос
// был бы неотличим от «передумал про структуру текущего»: та же дверь, тот же
// ответ, а результат — либо новый продукт, либо переписанный старый. Догадываться
// об этом на сервере нельзя, поэтому намерение называется явно.
//
// После создания страница переходит на НОВЫЙ продукт (`?product=<id>`): человек
// нажал «добавить» — он ждёт, что окажется в новом, а не останется в старом.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { ProjectTypeCard, PickerLabels } from "./project-type-picker.client";

export function AddProductCard(
  { types, labels, lang }:
  { types: ProjectTypeCard[]; labels: PickerLabels & { addProduct: string; addHint: string }; lang: string },
) {
  const router = useRouter();
  const [listOpen, setListOpen] = useState(false);
  const [card, setCard] = useState<ProjectTypeCard | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(type: ProjectTypeCard) {
    setBusy(true);
    try {
      const r = await fetch("/api/use-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "project-type", newProduct: true, typeId: type.id, typeTitle: type.title,
        }),
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(String(d?.error ?? labels.failed));
      setCard(null);
      setListOpen(false);
      router.push(`/${lang}/doc-use-cases?product=${d.product.id}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setListOpen(true)}
        className="flex min-w-[11rem] flex-1 flex-col justify-center gap-1 rounded-lg border border-dashed border-border p-2.5 text-left text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
      >
        <span className="flex items-center gap-1.5 text-[12px] font-medium">
          <Plus size={11} className="shrink-0" />{labels.addProduct}
        </span>
        <span className="text-[10px] leading-snug">{labels.addHint}</span>
      </button>

      {/* Список структур — тот же, что на первом экране. */}
      <Dialog open={listOpen} onOpenChange={(v) => { setListOpen(v); if (!v) setCard(null); }}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-4 py-2.5 pr-10">
            <DialogTitle className="text-[13px] font-semibold">{labels.lead}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(85vh-3rem)] overflow-auto px-4 py-3">
            <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">{labels.hint}</p>
            <div className="flex flex-wrap gap-2">
              {types.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setCard(t)}
                  className="flex min-w-[9rem] flex-1 flex-col items-start gap-0.5 rounded-lg border border-border px-3 py-2 text-left transition-colors hover:border-primary hover:bg-muted"
                >
                  <span className="text-[12px] font-medium text-foreground">{t.title}</span>
                  <span className="text-[10px] leading-snug text-muted-foreground">{t.tagline}</span>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Описание выбранной структуры — то же окно, что и на первом экране: один
          стандарт на оба места, чтобы человек не изучал панель дважды. */}
      <Dialog open={Boolean(card)} onOpenChange={(v) => { if (!v) setCard(null); }}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-4 py-2.5 pr-10">
            <DialogTitle className="text-[13px] font-semibold">{card?.title}</DialogTitle>
          </DialogHeader>
          {card && (
            <div className="max-h-[calc(85vh-7rem)] space-y-3 overflow-auto px-4 py-3 text-[11px] leading-relaxed">
              <p className="text-foreground">{card.definition}</p>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {labels.dialogExamples}
                </p>
                <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
                  {card.examples.map((x) => <li key={x}>{x}</li>)}
                </ul>
              </div>
              <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  {labels.dialogSignals}
                </p>
                <ul className="list-disc space-y-0.5 pl-4 text-foreground">
                  {card.signals.map((x) => <li key={x}>{x}</li>)}
                </ul>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {labels.dialogQuestions}
                </p>
                <ol className="list-decimal space-y-0.5 pl-4 text-muted-foreground">
                  {card.questions.map((q) => <li key={q}>{q}</li>)}
                </ol>
              </div>
            </div>
          )}
          <DialogFooter className="border-t border-border px-4 py-2.5">
            <Button size="sm" variant="outline" className="text-[11px]" onClick={() => setCard(null)} disabled={busy}>
              {labels.cancel}
            </Button>
            <Button size="sm" className="text-[11px]" onClick={() => card && create(card)} disabled={busy}>
              {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              {busy ? labels.saving : labels.choose}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
