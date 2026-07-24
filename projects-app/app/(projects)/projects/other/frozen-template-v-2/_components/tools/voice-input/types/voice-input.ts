// ТИПЫ микросервиса «голосовой ввод» — общий контракт клиентской и серверной половины в одном месте.
import type { RefObject } from "react";

/** Поле, принимающее речь; его курсор решает, КУДА встанет расшифровка. */
export type VoiceTargetRef =
  | RefObject<HTMLTextAreaElement | null>
  | RefObject<HTMLInputElement | null>;

/** Пропсы клиентского компонента `VoiceInput`. */
export type VoiceInputProps = {
  targetRef: VoiceTargetRef;
  value: string;
  /** Зовётся с полным новым текстом; курсор остаётся сразу после вставленных слов. */
  onChange: (next: string) => void;
  lang: string;
  disabled?: boolean;
};

/** Результат серверной расшифровки — что дверь `api/transcribe` возвращает клиенту. */
export type TranscribeResult =
  | { ok: true; text: string }
  | { ok: false; status: number; error: string; reason?: string };
