"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { voiceStrings } from "./voice-input-i18n";

// ГОЛОСОВОЙ ВВОД — копия примитива для МЯГКОГО ДЕВ-СЛОЯ `_shared-v2` (шаг 298): им пользуется дев-кнопка
// «Строить вместе с ИИ», которая тоже живёт здесь. Это осознанная копия закона двух слоёв: рантайм-версия
// того же примитива живёт ВНУТРИ папки автоматизации (`_components/shared/voice-input.client.tsx`) и служит
// её публичным полям (пульт запуска). Мягкий слой самодостаточен и не тянет ничего из папки автоматизации.
// Второго микрофона/MediaRecorder/пути расшифровки в пределах ОДНОГО слоя быть не должно — поле получает
// голос ПОДКЛЮЧЕНИЕМ этого компонента, а не новой реализацией.
//
// Почему копия, а не импорт платформенного: автоматизация обязана оставаться архивом — распаковал папку в
// другом месте, и всё работает (закон 0). Поэтому здесь нет ни shadcn, ни lucide, ни sonner: своя кнопка,
// свои иконки, ошибка показывается СТРОКОЙ ПОД КНОПКОЙ, а не тостом платформы.
//
// КАК СЕБЯ ВЕДЁТ (дизайн владельца, как в v1):
//   • УДЕРЖИВАЕШЬ кнопку — идёт запись; отпустил — запись уходит на расшифровку в свою дверь `api/transcribe`.
//   • Во время записи полоса 40px показывает приходящий звук: столбики 2px шириной через 1px, до 32px
//     высотой, дописываются слева направо — доказательство, что микрофон слышит.
//   • В центре полосы — плашка с прошедшим временем.
//   • ПОМНИТ КУРСОР: расшифровка встаёт ровно туда, где стоял курсор, а не в конец поля.
//
// СРЕДА: getUserMedia требует HTTPS (или localhost). В IP-режиме браузер откажет, поэтому кнопка честно
// выключается и объясняет причину; печатать можно всегда.
const BAR_WIDTH = 2; // px — спецификация владельца
const BAR_GAP = 1; // px
const BAR_MAX = 32; // px
const BAR_MIN = 2; // px — тишина рисует точку, полоса видимо жива
const BAR_TICK_MS = 100; // новый столбик десять раз в секунду — картинка читается как живой звук

type TargetRef =
  | React.RefObject<HTMLTextAreaElement | null>
  | React.RefObject<HTMLInputElement | null>;

/** Внутри ли мы фрейма (окно предпросмотра админки) — там браузер микрофон не даёт. */
function inFrame(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function MicIcon({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-3.5">
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" />
      {off ? <path d="M3 3l18 18" /> : null}
    </svg>
  );
}

export default function VoiceInput({
  targetRef,
  value,
  onChange,
  lang,
  disabled,
}: {
  /** Поле, которое принимает речь (его курсор решает КУДА). */
  targetRef: TargetRef;
  value: string;
  /** Зовётся с полным новым текстом; курсор остаётся сразу после вставленных слов. */
  onChange: (next: string) => void;
  lang: string;
  disabled?: boolean;
}) {
  const L = voiceStrings(lang);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bars, setBars] = useState<number[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [supported, setSupported] = useState(true);
  const [note, setNote] = useState("");

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const clock = useRef<ReturnType<typeof setInterval> | null>(null);
  const caret = useRef<{ start: number; end: number } | null>(null);
  const maxBars = useRef(64);

  // Микрофон браузер отдаёт только в защищённом контексте — говорим об этом заранее, а не по клику.
  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        window.isSecureContext &&
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        typeof MediaRecorder !== "undefined",
    );
  }, []);

  const cleanup = useCallback(() => {
    if (ticker.current) { clearInterval(ticker.current); ticker.current = null; }
    if (clock.current) { clearInterval(clock.current); clock.current = null; }
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    void audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
    analyser.current = null;
    recorder.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  /** Расшифровка встаёт туда, где стоял курсор в момент начала речи. */
  const insert = useCallback(
    (text: string) => {
      if (!text) return;
      const el = targetRef.current;
      const pos = caret.current ?? { start: value.length, end: value.length };
      const before = value.slice(0, pos.start);
      const after = value.slice(pos.end);
      const glue = before && !/\s$/.test(before) ? " " : "";
      const tail = after && !/^\s/.test(after) ? " " : "";
      onChange(`${before}${glue}${text}${tail}${after}`);
      const caretAt = (before + glue + text).length;
      requestAnimationFrame(() => {
        if (!el) return;
        el.focus();
        el.setSelectionRange(caretAt, caretAt);
      });
    },
    [targetRef, value, onChange],
  );

  const transcribe = useCallback(
    async (blob: Blob) => {
      if (blob.size < 1200) return; // касание, а не речь
      setBusy(true);
      try {
        const fd = new FormData();
        fd.append("audio", new File([blob], "speech.webm", { type: blob.type || "audio/webm" }));
        // СВОЯ дверь расшифровки, адресуется ОТНОСИТЕЛЬНО текущего пути — без хардкода слага (закон 0).
        const apiBase = location.pathname.replace(/\/+$/, "") + "/api";
        const r = await fetch(`${apiBase}/transcribe`, { method: "POST", body: fd });
        const d = (await r.json()) as { text?: string; reason?: string };
        if (!r.ok) { setNote(d.reason === "no-key" ? L.noKey : L.failed); return; }
        if (!d.text) { setNote(L.nothing); return; }
        setNote("");
        insert(d.text);
      } catch {
        setNote(L.failed);
      } finally {
        setBusy(false);
      }
    },
    [insert, L],
  );

  const startRecording = useCallback(async () => {
    if (recording || busy || disabled || !supported) return;
    const el = targetRef.current;
    caret.current = el
      ? { start: el.selectionStart ?? value.length, end: el.selectionEnd ?? value.length }
      : { start: value.length, end: value.length };

    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const name = (e as { name?: string })?.name ?? "";
      setNote(name === "NotFoundError" || name === "DevicesNotFoundError" ? L.micNoDevice : inFrame() ? L.frame : L.micDenied);
      return;
    }
    setNote("");
    stream.current = media;
    chunks.current = [];

    const rec = new MediaRecorder(media);
    rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
    rec.onstop = () => { void transcribe(new Blob(chunks.current, { type: rec.mimeType || "audio/webm" })); };
    rec.start();
    recorder.current = rec;

    // Столбики И ЕСТЬ звук: по замеру громкости на тик, дописываются справа.
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(media);
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    audioCtx.current = ctx;
    analyser.current = an;
    const buf = new Uint8Array(an.frequencyBinCount);

    setBars([]);
    setSeconds(0);
    setRecording(true);

    ticker.current = setInterval(() => {
      const a = analyser.current;
      if (!a) return;
      a.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length); // 0…1
      const h = Math.min(BAR_MAX, Math.max(BAR_MIN, Math.round(rms * 3 * BAR_MAX)));
      setBars((b) => [...b, h].slice(-maxBars.current));
    }, BAR_TICK_MS);

    clock.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }, [recording, busy, disabled, supported, targetRef, value, transcribe, L]);

  const stopRecording = useCallback(() => {
    if (!recording) return;
    setRecording(false);
    try { recorder.current?.stop(); } catch { /* уже остановлен */ }
    if (ticker.current) { clearInterval(ticker.current); ticker.current = null; }
    if (clock.current) { clearInterval(clock.current); clock.current = null; }
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    void audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
    analyser.current = null;
  }, [recording]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || busy || !supported}
          title={supported ? L.tipOk : L.tipInsecure}
          onPointerDown={(e) => { e.preventDefault(); void startRecording(); }}
          onPointerUp={stopRecording}
          onPointerLeave={stopRecording}
          onPointerCancel={stopRecording}
          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
            recording ? "border-rose-500/50 text-rose-700 dark:text-rose-400" : "hover:bg-accent"
          }`}
        >
          <MicIcon off={!supported} />
          {busy ? L.transcribing : recording ? L.recording : L.hold}
        </button>

        {/* ПОЛОСА ЗВУКА — 40px; столбики 2px через 1px, до 32px, дописываются слева направо; в центре
            плашка с прошедшим временем. */}
        {recording ? (
          <div
            ref={(el) => { if (el) maxBars.current = Math.max(16, Math.floor(el.clientWidth / (BAR_WIDTH + BAR_GAP))); }}
            className="relative h-10 flex-1 overflow-hidden rounded-md border bg-muted/40"
          >
            <div className="absolute inset-0 flex items-center" style={{ gap: `${BAR_GAP}px`, paddingInline: 2 }}>
              {bars.map((h, i) => (
                <span key={i} className="shrink-0 rounded-sm bg-primary/70" style={{ width: `${BAR_WIDTH}px`, height: `${h}px` }} />
              ))}
            </div>
            <span className="absolute left-1/2 top-1/2 flex h-5 -translate-x-1/2 -translate-y-1/2 items-center rounded bg-background px-2 text-[11px] font-medium tabular-nums text-foreground shadow-sm">
              {mm}:{ss}
            </span>
          </div>
        ) : null}
      </div>

      {/* Причина отказа — строкой рядом с кнопкой: тостов у автоматизации нет, а тупика быть не должно. */}
      {!supported ? <p className="text-xs text-muted-foreground">{L.tipInsecure}</p> : null}
      {note ? <p className="text-xs text-amber-700 dark:text-amber-400">{note}</p> : null}
    </div>
  );
}
