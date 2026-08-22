"use client";

// Описание секции, написанное ВЛАДЕЛЬЦЕМ (шаг 541, требование владельца
// 2026-08-22: «не только искусственный интеллект может всегда писать, но и человек
// может его создавать»).
//
// 🔒 ЭТО ВТОРОЙ ГОЛОС, А НЕ ПРАВКА ЗАМЕТОК АГЕНТА. Выше в аккордеоне лежит проза из
// карточки вида — там агент записал, что ломается и что уже оплачено ошибкой.
// Здесь владелец говорит своё: где эту секцию применять, чего он от неё хочет.
// Смешать их значило бы позволить одному затереть другого молча.
//
// 🔒 ПУСТОЕ ПОЛЕ СТИРАЕТ ЗАПИСЬ, а не сохраняет пустую строку: «владелец ничего не
// сказал» и «владелец сказал пусто» — разные вещи, и вторая была бы ложью агенту.
//
// Голос стоит рядом не для красоты: описывать назначение секции вслух получается
// подробнее, чем печатать, а подробность здесь и есть польза — этот текст читает
// агент, когда выбирает секцию.

import { useRef, useState } from "react";
import { Loader2, Save, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import VoiceInput from "@/_tools/voice-input/client/voice-input.client";

export type OwnerNoteLabels = {
  label: string;
  placeholder: string;
  save: string;
  saving: string;
  saved: string;
  failed: string;
  voiceHint: string;
};

export function OwnerNote(
  { kind, initial, lang, labels }: {
    kind: string;
    initial: string;
    lang: string;
    labels: OwnerNoteLabels;
  },
) {
  const field = useRef<HTMLTextAreaElement | null>(null);
  const [text, setText] = useState(initial);
  const [savedText, setSavedText] = useState(initial);
  const [busy, setBusy] = useState(false);

  const dirty = text.trim() !== savedText.trim();

  async function save() {
    if (!dirty) return;
    setBusy(true);
    try {
      const res = await fetch("/api/sections/description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kind, text }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d?.error) throw new Error(String(d?.error ?? labels.failed));
      setSavedText(text);
      toast.success(labels.saved);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{labels.label}</p>

      <textarea
        ref={field}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={labels.placeholder}
        rows={4}
        spellCheck={false}
        className="mt-1 w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 text-[11px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50"
      />

      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <VoiceInput
          targetRef={field}
          value={text}
          onChange={setText}
          lang={lang}
          apiUrl="/api/transcribe"
        />
        <Button size="sm" variant="outline" onClick={save} disabled={busy || !dirty}>
          {busy ? <Loader2 size={12} className="animate-spin" /> : dirty ? <Save size={12} /> : <Check size={12} />}
          {busy ? labels.saving : labels.save}
        </Button>
        <span className="text-[10px] text-muted-foreground">{labels.voiceHint}</span>
      </div>
    </div>
  );
}
