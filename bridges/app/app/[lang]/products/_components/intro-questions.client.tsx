"use client";

// Вводные вопросы — вход в Quiz (владелец 2026-08-10).
//
// 🔒 ДЕТЕРМИНИРОВАННЫЕ, БЕЗ ВЫЗОВА МОДЕЛИ. Первый экран обязан открыться мгновенно
// и одинаково для всех: модель здесь не нужна, а её отказ (нет ключа, нет сети)
// закрыл бы вход в продукт целиком. Вопросы написаны заранее и переведены.
//
// 🔒 ПРОЙТИ МИМО НЕЛЬЗЯ. Пока на них не ответили, дальше не пускаем: без затравки
// автоквиз развернёт пустоту, а модель начнёт выдумывать продукт за владельца.
//
// По одному вопросу за раз — не простыня из семи полей. Семь полей сразу читаются
// как анкета и заполняются в одно слово каждое; по одному человек отвечает
// развёрнуто, а голосом — тем более.

import { useRef, useState } from "react";
import { productParam } from "./product-param";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import VoiceInput from "@/_tools/voice-input/client/voice-input.client";

export type IntroLabels = {
  progress: string;          // «вопрос {n} из {total}»
  placeholder: string;
  next: string; back: string; finish: string; saving: string;
  saved: string; failed: string;
  tooShort: string;
  voiceHint: string;
};

export function IntroQuestions(
  { questions, lang, labels }: { questions: string[]; lang: string; labels: IntroLabels },
) {
  const router = useRouter();
  const field = useRef<HTMLTextAreaElement | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ""));
  const [busy, setBusy] = useState(false);

  const last = step === questions.length - 1;
  const current = answers[step] ?? "";

  function setCurrent(v: string) {
    setAnswers((prev) => prev.map((a, i) => (i === step ? v : a)));
  }

  async function finish() {
    // Короткий ответ — не отказ, а предупреждение: человек вправе ответить
    // односложно, но пусть увидит, что затравка получится бедной.
    const total = answers.join(" ").trim();
    if (total.length < 40) { toast.error(labels.tooShort); return; }

    setBusy(true);
    try {
      const seed = questions.map((q, i) => `${q}\n${answers[i]?.trim() || "—"}`).join("\n\n");
      const turns = questions.flatMap((q, i) => ([
        { role: "assistant" as const, content: q },
        { role: "user" as const, content: answers[i]?.trim() || "—" },
      ]));
      const r = await fetch("/api/use-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: productParam(), op: "seed", seed, turns }),
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(String(d?.error ?? labels.failed));
      toast.success(labels.saved);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {labels.progress.replace("{n}", String(step + 1)).replace("{total}", String(questions.length))}
      </p>

      <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-foreground">{questions[step]}</p>

      <textarea
        ref={field}
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        placeholder={labels.placeholder}
        rows={4}
        className="mt-3 w-full rounded-md border border-border bg-background p-2.5 text-[12px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {/* Голос стоит здесь не для красоты: описывать замысел вслух получается
          подробнее, чем печатать, а это ровно то, чего Quiz и добивается. */}
      <div className="mt-2 flex items-center gap-2">
        <VoiceInput
          targetRef={field}
          value={current}
          onChange={setCurrent}
          lang={lang}
          apiUrl="/api/transcribe"
        />
        <span className="text-[10px] text-muted-foreground">{labels.voiceHint}</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="text-[11px] text-muted-foreground underline hover:text-foreground"
          >
            {labels.back}
          </button>
        )}
        <span className="flex-1" />
        {last ? (
          <Button size="sm" className="text-[11px]" onClick={finish} disabled={busy}>
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            {busy ? labels.saving : labels.finish}
          </Button>
        ) : (
          <Button size="sm" className="text-[11px]" onClick={() => setStep((s) => s + 1)}>
            {labels.next}<ArrowRight size={11} />
          </Button>
        )}
      </div>
    </div>
  );
}
