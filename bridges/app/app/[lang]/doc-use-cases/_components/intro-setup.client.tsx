"use client";

// Экран ДО опроса: владелец правит сами вопросы (владелец 2026-08-14).
//
// 🔒 ЗАЧЕМ ОН ПОЯВИЛСЯ. Семь вводных вопросов были зашиты в словарь панели и
// задавались одинаково интернет-магазину и клинике. Но вопрос — половина ответа:
// неверный заставляет человека описывать не тот продукт, который у него в
// голове, и весь дальнейший Quiz идёт по чужой колее. Заметить это в конце,
// глядя на кейсы, уже поздно — переписывать придётся всё.
//
// Поэтому список показывается ПЕРЕД опросом целиком: видно, о чём спросят, и
// каждый вопрос можно переписать, продиктовать, удалить или добавить свой.
//
// Утверждённый список уезжает файлом в папку проекта (`USE-CASES/RAW/
// questions.json`) — он едет в репозиторий вместе с кейсами, и агент видит, о чём
// владельца спрашивали.

import { useRef, useState } from "react";
import { productParam } from "./product-param";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, ArrowRight, RotateCcw, Mic } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import VoiceInput from "@/_tools/voice-input/client/voice-input.client";

export type SetupLabels = {
  lead: string;
  hint: string;
  add: string;
  removeOne: string;
  restore: string;
  restored: string;
  start: string;
  saving: string;
  failed: string;
  atLeastOne: string;
  placeholder: string;
  voiceFor: string;
  voiceClose: string;
  count: string;
};

export function IntroSetup(
  { suggested, lang, labels }: { suggested: string[]; lang: string; labels: SetupLabels },
) {
  const router = useRouter();
  const [items, setItems] = useState<string[]>(() => (suggested.length ? [...suggested] : [""]));
  const [busy, setBusy] = useState(false);
  // Голос открывается ДЛЯ ОДНОГО вопроса. Держать микрофон у каждой строки
  // значило бы поставить рядом семь записывающих кнопок — вместо инструмента
  // получился бы шум.
  const [voiceAt, setVoiceAt] = useState<number | null>(null);
  const voiceField = useRef<HTMLTextAreaElement | null>(null);

  const setAt = (i: number, v: string) => setItems((prev) => prev.map((q, k) => (k === i ? v : q)));
  const removeAt = (i: number) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, k) => k !== i) : prev));
    setVoiceAt(null);
  };

  async function start() {
    const clean = items.map((q) => q.trim()).filter(Boolean);
    if (!clean.length) { toast.error(labels.atLeastOne); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/use-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: productParam(), op: "questions", questions: clean }),
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(String(d?.error ?? labels.failed));
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-[11px] leading-relaxed text-foreground">{labels.lead}</p>
      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{labels.hint}</p>

      <ul className="mt-3 space-y-2">
        {items.map((q, i) => (
          <li key={i} className="rounded-md border border-border p-2">
            <div className="flex items-start gap-2">
              <span className="mt-1.5 w-4 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                {i + 1}
              </span>
              <textarea
                value={q}
                onChange={(e) => setAt(i, e.target.value)}
                placeholder={labels.placeholder}
                rows={2}
                className="w-full resize-y rounded border border-border bg-background p-2 text-[12px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setVoiceAt(voiceAt === i ? null : i)}
                  title={voiceAt === i ? labels.voiceClose : labels.voiceFor}
                  aria-label={voiceAt === i ? labels.voiceClose : labels.voiceFor}
                  className={`rounded border border-border p-1 transition-colors hover:bg-accent ${
                    voiceAt === i ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Mic size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  disabled={items.length < 2}
                  title={labels.removeOne}
                  aria-label={labels.removeOne}
                  className="rounded border border-border p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive disabled:opacity-40"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {/* Голос пишет В ТОТ ЖЕ текст вопроса: продиктованное встаёт туда, где
                стоял курсор, — правило одно на весь продукт. */}
            {voiceAt === i && (
              <div className="mt-2 pl-6">
                <textarea ref={voiceField} value={q} onChange={(e) => setAt(i, e.target.value)} className="hidden" />
                <VoiceInput
                  targetRef={voiceField}
                  value={q}
                  onChange={(v) => setAt(i, v)}
                  lang={lang}
                  apiUrl="/api/transcribe"
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="text-[11px]"
          onClick={() => setItems((prev) => [...prev, ""])}
        >
          <Plus size={11} />{labels.add}
        </Button>
        <button
          type="button"
          onClick={() => { setItems(suggested.length ? [...suggested] : [""]); setVoiceAt(null); toast.success(labels.restored); }}
          className="flex items-center gap-1 text-[11px] text-muted-foreground underline hover:text-foreground"
        >
          <RotateCcw size={11} />{labels.restore}
        </button>
        <span className="text-[10px] text-muted-foreground">
          {labels.count.replace("{n}", String(items.filter((q) => q.trim()).length))}
        </span>
        <span className="flex-1" />
        <Button size="sm" className="text-[11px]" onClick={start} disabled={busy}>
          {busy ? <Loader2 size={11} className="animate-spin" /> : <ArrowRight size={11} />}
          {busy ? labels.saving : labels.start}
        </Button>
      </div>
    </div>
  );
}
