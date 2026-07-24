// ТИПЫ микросервиса «голосовой ввод» — ДЕВ-СЛОЙ (`_shared-v2`). Осознанная копия рантайм-типов (закон двух
// слоёв): дев-слой самодостаточен и не тянет типы из папки конкретной автоматизации.
import type { RefObject } from "react";

export type VoiceTargetRef =
  | RefObject<HTMLTextAreaElement | null>
  | RefObject<HTMLInputElement | null>;

export type VoiceInputProps = {
  targetRef: VoiceTargetRef;
  value: string;
  onChange: (next: string) => void;
  lang: string;
  disabled?: boolean;
};

export type TranscribeResult =
  | { ok: true; text: string }
  | { ok: false; status: number; error: string; reason?: string };
