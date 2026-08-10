"use client";

// Создать документ передачи из шаблона (2026-08-10).
//
// ЗАЧЕМ. Файл едет со свежим стартером, но проект мог родиться раньше — и тогда
// страница открывалась ПУСТОЙ: раздел есть, объяснения есть, а документа нет и
// взять его неоткуда. Пустая страница вместо документа — не «пока не заполнено»,
// а невыполненное обещание раздела.
//
// Создание — ЯВНОЕ действие человека. Писать файл в чужой репозиторий молча, при
// одном лишь открытии страницы, нельзя: это его проект и его история изменений.
//
// Текст шаблона приезжает пропсом с сервера: он живёт файлом в панели
// (`_content/CONTEXT-STATE.template.md`), а не строкой в коде, поэтому его можно
// править как обычный документ.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CreateDoc(
  { docKey, template, labels }:
  {
    docKey: string;
    template: string;
    labels: { create: string; creating: string; created: string; failed: string; hint: string };
  },
) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const res = await fetch(`/api/product-docs/${docKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: template }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(String(data?.error ?? labels.failed));
      toast.success(labels.created);
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-border p-3">
      <p className="text-[10px] leading-relaxed text-muted-foreground">{labels.hint}</p>
      <Button size="sm" className="mt-2 text-[11px]" onClick={create} disabled={busy || !template}>
        {busy ? <Loader2 size={11} className="animate-spin" /> : <FilePlus2 size={11} />}
        {busy ? labels.creating : labels.create}
      </Button>
    </div>
  );
}
