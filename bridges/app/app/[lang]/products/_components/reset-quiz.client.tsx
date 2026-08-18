"use client";

// «Начать сначала» — выход из плохого опроса (владелец 2026-08-14).
//
// 🔒 ПОЧЕМУ ЭТО НЕ УДОБСТВО, А ПОЧИНКА. Затравка писалась один раз и не
// удалялась ничем: человек, проскочивший первый опрос наспех («qqq qwerqwer» —
// реальный случай), оставался в нём НАВСЕГДА. Хуже: лента разговора копится и
// уходит в модель на каждый вызов, поэтому даже отличные новые ответы тонули в
// старом мусоре. Без этой кнопки качественный опрос недостижим.
//
// 🔒 ОКНО НАЗЫВАЕТ ЧИСЛА, А НЕ «ВСЁ». «Удалить всё» без счёта либо не нажимают
// вовсе, либо нажимают вслепую — оба исхода плохие. Поэтому здесь стоит, сколько
// именно ответов, реплик и кейсов исчезнет, и сколько из кейсов подтверждено.
//
// 🔒 И ГОВОРИТ ПРО РАЗРАБОТКУ. Первый страх у нажимающего — «а не сотру ли я
// приложение». Кейсы это описание замысла, а не код; сказать об этом надо в
// самом окне, а не в справке, которую в этот момент никто не откроет.

import { useState } from "react";
import { productParam } from "./product-param";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type ResetLabels = {
  action: string;
  title: string;
  body: string;
  /** «Исчезнет: {answers} ответов, {turns} реплик, {cases} кейсов ({confirmed} подтверждённых)» */
  counts: string;
  safeDev: string;
  archive: string;
  cancel: string;
  confirm: string;
  working: string;
  done: string;
  failed: string;
};

export type ResetCounts = { seedAnswers: number; turns: number; cases: number; confirmed: number };

export function ResetQuiz({ labels, counts }: { labels: ResetLabels; counts: ResetCounts }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const r = await fetch("/api/use-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: productParam(), op: "reset" }),
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(String(d?.error ?? labels.failed));
      setOpen(false);
      toast.success(labels.done, { duration: 8000 });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(false);
    }
  }

  const fill = (t: string) => t
    .replace("{answers}", String(counts.seedAnswers))
    .replace("{turns}", String(counts.turns))
    .replace("{cases}", String(counts.cases))
    .replace("{confirmed}", String(counts.confirmed));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground underline transition-colors hover:text-destructive"
      >
        <RotateCcw size={11} />{labels.action}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="mt-16 w-full max-w-md rounded-lg border border-border bg-background p-4 shadow-2xl">
            <p className="flex items-center gap-2 text-[13px] font-medium text-foreground">
              <AlertTriangle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
              {labels.title}
            </p>

            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{labels.body}</p>

            <p className="mt-2 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-[11px] leading-relaxed text-destructive">
              {fill(labels.counts)}
            </p>

            <p className="mt-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-300">
              {labels.safeDev}
            </p>

            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{labels.archive}</p>

            <div className="mt-3 flex items-center justify-end gap-2">
              <Button size="sm" variant="outline" className="text-[11px]" onClick={() => setOpen(false)} disabled={busy}>
                {labels.cancel}
              </Button>
              <Button size="sm" variant="destructive" className="text-[11px]" onClick={run} disabled={busy}>
                {busy ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                {busy ? labels.working : labels.confirm}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
