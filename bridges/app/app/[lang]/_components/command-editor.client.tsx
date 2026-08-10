"use client";

// Фраза активации инструкции — показ и правка (2026-08-10).
//
// 🔒 ЯКОРЬ НЕ РЕДАКТИРУЕТСЯ. «Fractera» — одно слово на все команды продукта;
// правится только ФРАЗА после него. Дать менять якорь значило бы позволить
// назначить командой обычное слово, которое сработает в первой же диктовке.
//
// Правка на месте, а не отдельной страницей: команду читают и меняют в одном
// движении, и оба действия живут там, где виден весь корпус.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type CommandLabels = {
  caption: string;          // «команда активации»
  helpTitle: string;        // подсказка под (?)
  edit: string; save: string; saving: string; cancel: string;
  saved: string; failed: string;
  phrasePlaceholder: string;
  anchorNote: string;
};

export function CommandEditor(
  { docKey, lang, anchor, phrase, labels }:
  { docKey: string; lang: string; anchor: string; phrase: string; labels: CommandLabels },
) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(phrase);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/config/instructions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: { doc: docKey, lang, phrase: value } }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(String(data?.error ?? labels.failed));
      toast.success(labels.saved);
      setEditing(false);
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[11px] text-muted-foreground">{anchor},</span>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={labels.phrasePlaceholder}
          className="h-7 w-48 text-[11px]"
          autoFocus
        />
        <Button size="sm" className="h-7 text-[10px]" onClick={save} disabled={busy}>
          {busy ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
          {busy ? labels.saving : labels.save}
        </Button>
        <button
          type="button"
          onClick={() => { setValue(phrase); setEditing(false); }}
          className="text-[10px] text-muted-foreground underline hover:text-foreground"
        >
          {labels.cancel}
        </button>
        <span className="basis-full text-[10px] text-muted-foreground">{labels.anchorNote}</span>
      </span>
    );
  }

  return (
    <span className="mt-0.5 flex items-center gap-1.5">
      <span className="text-[10px] text-muted-foreground">{labels.caption}</span>

      {/* Пояснение — родной <details>, без JS и без всплывашки, которую нельзя
          прочитать с телефона. */}
      <details className="relative inline-block">
        <summary className="cursor-pointer list-none text-[10px] text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
          (?)
        </summary>
        <span className="absolute left-0 top-5 z-20 block w-72 rounded-md border border-border bg-background p-2 text-[10px] leading-relaxed text-muted-foreground shadow-lg">
          {labels.helpTitle}
        </span>
      </details>

      <button
        type="button"
        onClick={() => setEditing(true)}
        title={labels.edit}
        className="text-[13px] font-bold underline underline-offset-2 text-foreground hover:text-primary"
      >
        {anchor}, {phrase}
      </button>

      <Pencil size={10} className="text-muted-foreground/60" />
    </span>
  );
}
