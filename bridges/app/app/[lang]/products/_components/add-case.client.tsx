"use client";

// Дописать кейс руками (владелец 2026-08-18).
//
// 🔒 ЗАЧЕМ ЭТА КНОПКА СУЩЕСТВУЕТ. Опрос и Quiz — одноразовые: ответив на вопросы и
// пройдя разговор, владелец получает кейсы и обе двери за собой закрывает. Но
// продукт живёт дальше, и через неделю выясняется седьмой сценарий. До этой кнопки
// у человека оставался один выход — «Начать сначала», то есть выбросить тридцать
// реплик разговора ради одного кейса.
//
// 🔒 КЕЙС РОЖДАЕТСЯ ЧЕРНОВИКОМ, как и всякий другой. Дописал его человек или
// модель — подтверждает всё равно владелец, отдельным нажатием: иначе гейт
// «нет подтверждённого кейса — не строим» превращается в украшение.
//
// Окно — тот же способ входа, что у Quiz, но внутренность своя: Quiz это разговор,
// а здесь список поля «заголовок» и «сценарий».

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

export function AddCase(
  { productId, labels }: {
    productId: string;
    labels: {
      action: string; title: string; hint: string; name: string; summary: string;
      save: string; cancel: string; saved: string; saving: string; failed: string;
    };
  },
) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/use-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ op: "add-case", productId, title: name, summary }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) throw new Error(String(d?.error ?? labels.failed));
      toast.success(labels.saved);
      setName(""); setSummary(""); setOpen(false);
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
        <Plus size={13} />{labels.action}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-[15px]">{labels.title}</DialogTitle>
          </DialogHeader>

          <p className="text-[12px] leading-relaxed text-muted-foreground">{labels.hint}</p>

          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-medium text-foreground">{labels.name}</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="text-[13px]" />
          </label>

          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] font-medium text-foreground">{labels.summary}</span>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={6}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] leading-relaxed text-foreground"
            />
          </label>

          <DialogFooter className="mt-3">
            <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              {labels.cancel}
            </Button>
            {/* Пустые поля не отправляются: сервер их всё равно отвергнет, а
                отказ, который можно было предвидеть, лучше не показывать вовсе. */}
            <Button size="sm" onClick={save} disabled={busy || !name.trim() || !summary.trim()}>
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {busy ? labels.saving : labels.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
