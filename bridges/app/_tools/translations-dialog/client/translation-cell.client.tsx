"use client";

// Один контейнер перевода — один язык.
//
// Заголовок несёт флаг и РОДНОЕ имя языка: человек, добавляющий испанский, ищет
// глазами «Español», а не «Spanish».
//
// 🔒 ПОЛЕ НЕ ПУСТОЕ. Пока перевода нет, в нём стоит значение базового языка —
// это и текст, который надо перевести, перед глазами, и честное состояние: пункт
// живёт базовым языком, пока его не заменили.
//
// 🔒 СВОЯ КНОПКА СОХРАНЕНИЯ У КАЖДОГО ЯЗЫКА. Появляется, как только текст
// изменён, и уходит после сохранения. Так можно поправить два языка из десяти и
// сохранить именно их, не трогая остальные.

import { useRef } from "react";
import { Check, Loader2 } from "lucide-react";
import VoiceInput from "@/_tools/voice-input/client/voice-input.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ALL_LANGUAGE_METADATA } from "@/config/translations/language-metadata";

export function TranslationCell(
  { lang, value, multiline, dirty, saved, saving, uiLang, labels, onChange, onSave }: {
    lang: string;
    value: string;
    multiline?: boolean;
    /** Текст отличается от исходного — значит есть что сохранять. */
    dirty: boolean;
    saved: boolean;
    saving: boolean;
    /** Язык ПАНЕЛИ — на нём говорит голосовой ввод подсказками. */
    uiLang: string;
    labels: { save: string; saving: string; savedMark: string };
    onChange: (next: string) => void;
    onSave: () => void;
  },
) {
  const field = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const meta = ALL_LANGUAGE_METADATA[lang];

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span aria-hidden>{meta?.flag ?? "🏳"}</span>
        <span className="text-[11px] font-medium text-foreground">{meta?.nativeName ?? lang}</span>
        <span className="font-mono text-[10px] uppercase text-muted-foreground">{lang}</span>
        {saved && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
            <Check size={10} />{labels.savedMark}
          </span>
        )}
      </div>

      {multiline ? (
        <textarea
          ref={area}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-md border border-border bg-muted px-2 py-1.5 text-[11px] text-foreground focus:outline-none"
        />
      ) : (
        <Input ref={field} value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-xs" />
      )}

      <div className="mt-1.5 flex items-center justify-between gap-2">
        {/* Голос диктуется НА ЯЗЫКЕ КОНТЕЙНЕРА: испанский перевод по-испански.
            Микрофон — существующий инструмент панели, второго здесь нет. */}
        <VoiceInput
          targetRef={multiline ? area : field}
          value={value}
          onChange={onChange}
          lang={lang || uiLang}
          apiUrl="/api/transcribe"
        />
        {dirty && !saved && (
          <Button size="sm" variant="secondary" onClick={onSave} disabled={saving} className="h-7 text-[11px]">
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            {saving ? labels.saving : labels.save}
          </Button>
        )}
      </div>
    </div>
  );
}
