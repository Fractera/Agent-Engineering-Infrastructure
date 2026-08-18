"use client";

// Правка ответов на вводные вопросы (2026-08-18).
//
// 🔒 ВОПРОСЫ ЗДЕСЬ НЕ ПРАВЯТСЯ, И ЭТО НАМЕРЕННО. Вопрос — половина ответа: сменив
// вопрос под написанным ответом, владелец получил бы пару, где ответ отвечает не на
// то, что спрошено, и заметил бы это на кейсах, когда переписывать надо всё. Список
// вопросов утверждается один раз, до опроса; после — только ответы.
//
// 🔒 ПОРЯДОК ЗНАЧИМ. Ответы уезжают массивом той же длины и в том же порядке, что
// вопросы: ответ живёт под своим вопросом, и сдвиг на один означает, что все
// последующие отвечают на чужое.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

export function IntakeEditor(
  { productId, questions, answers, labels }: {
    productId: string;
    questions: string[];
    answers: string[];
    labels: {
      action: string; title: string; question: string; answer: string;
      save: string; cancel: string; saved: string; saving: string; failed: string;
    };
  },
) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // Массив ровно по числу вопросов: короче — часть ответов потерялась бы молча.
  const [draft, setDraft] = useState<string[]>(
    questions.map((_, i) => answers[i] ?? ""),
  );

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/use-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ op: "answers", productId, answers: draft }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) throw new Error(String(d?.error ?? labels.failed));
      toast.success(labels.saved);
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil size={13} />{labels.action}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[15px]">{labels.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {questions.map((question, i) => (
              <div key={`${i}-${question.slice(0, 24)}`}>
                <p className="mb-1 text-[13px] leading-relaxed text-foreground">
                  <span className="mr-1.5 text-[11px] text-muted-foreground">{i + 1}.</span>
                  {question}
                </p>
                <textarea
                  value={draft[i] ?? ""}
                  onChange={(e) => setDraft((prev) => prev.map((v, k) => (k === i ? e.target.value : v)))}
                  rows={3}
                  aria-label={`${labels.answer} ${i + 1}`}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] leading-relaxed text-foreground"
                />
              </div>
            ))}
          </div>

          <DialogFooter className="mt-3">
            <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              {labels.cancel}
            </Button>
            <Button size="sm" onClick={save} disabled={busy}>
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {busy ? labels.saving : labels.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
