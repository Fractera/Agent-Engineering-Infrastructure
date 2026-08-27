"use client";

// Блок инструкции с кнопкой «скопировать» (шаг 25-5).
//
// 🔒 УСПЕХ КОПИРОВАНИЯ ГОВОРИТСЯ СЛОВОМ, А НЕ ПОДРАЗУМЕВАЕТСЯ. Буфер обмена умеет
// отказывать молча: сайт без HTTPS, отозванное разрешение, окно не в фокусе. Человек,
// который «скопировал» и вставил пустоту, винит агента, а не кнопку.
//
// 🔒 ТЕКСТ ВИДЕН ЦЕЛИКОМ И БЕЗ JS. Инструкция лежит в разметке; кнопка лишь избавляет
// от выделения мышью. Отказал буфер — человек выделяет руками и всё равно проходит шаг.

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export type CopyLabels = { copy: string; copied: string; failed: string };

export function CopyBlock({ text, labels }: { text: string; labels: CopyLabels }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      toast.success(labels.copied);
      window.setTimeout(() => setDone(false), 2500);
    } catch {
      // Не «ничего не произошло», а прямая причина: буфер недоступен, выделяйте руками.
      toast.error(labels.failed);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-muted/40">
      <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {labels.copy}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[10px] font-medium hover:bg-background"
        >
          {done ? <Check size={10} className="text-green-600" /> : <Copy size={10} />}
          {done ? labels.copied : labels.copy}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words px-3 py-2.5 text-[11px] leading-relaxed text-foreground">
        {text}
      </pre>
    </div>
  );
}
