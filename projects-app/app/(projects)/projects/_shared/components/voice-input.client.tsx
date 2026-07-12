"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// VOICE INPUT — ONE primitive, every input of the application (step 232, owner's decision).
//
// Mount it next to ANY text field and that field gains speech. There is no second microphone, no second
// MediaRecorder and no second transcription path in the product: a new input gets voice by mounting this
// component, never by re-implementing it (the rule lives in the workspace CLAUDE.md).
//
// HOW IT BEHAVES (owner's design):
//   • HOLD the button → recording runs. Release → the recording goes to the AI for transcription.
//   • While recording, a 40px-tall container shows the sound arriving: vertical bars, 2px wide, 1px apart,
//     up to 32px tall, appended left → right like a ticker, each bar as tall as the voice is loud at that
//     moment. It is the proof that the microphone hears you.
//   • In the centre of that container sits a small 20px chip on an opaque backdrop with the elapsed time.
//   • CARET-AWARE: put the cursor anywhere inside text you already have, hold the mic, speak — the
//     transcript lands exactly at the cursor, it never overwrites or appends blindly.
//
// ENVIRONMENT: getUserMedia needs a SECURE context (HTTPS or localhost). In IP mode (http://<ip>:3003) the
// browser refuses it, so the button disables itself and says why, instead of failing silently. Typing (and
// OS-level dictation) always stays available.
const BAR_WIDTH = 2;   // px — the owner's spec
const BAR_GAP = 1;     // px
const BAR_MAX = 32;    // px
const BAR_MIN = 2;     // px — silence still draws a dot, so the ticker is visibly alive
// How often a new bar is appended. The owner said "a new bar every second"; at 3px per bar that is a nearly
// static picture, so the ticker samples ten times faster and reads as live sound. One constant to retune.
const BAR_TICK_MS = 100;

// A ref object is invariant in TypeScript, so the two field kinds are spelled out rather than unioned inside
// one RefObject — this is what lets a caller pass a plain useRef<HTMLTextAreaElement | null>.
type TargetRef =
  | React.RefObject<HTMLTextAreaElement | null>
  | React.RefObject<HTMLInputElement | null>;

export function VoiceInput({
  targetRef,
  value,
  onChange,
  disabled,
  className,
}: {
  /** The field that receives the speech (its caret decides WHERE). */
  targetRef: TargetRef;
  value: string;
  /** Called with the full new text; the caret is left right after the inserted words. */
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bars, setBars] = useState<number[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [supported, setSupported] = useState(true);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const clock = useRef<ReturnType<typeof setInterval> | null>(null);
  const caret = useRef<{ start: number; end: number } | null>(null);
  const maxBars = useRef(64);

  // A browser only hands out the microphone in a secure context — say so up front rather than at the click.
  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      window.isSecureContext &&
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== "undefined";
    setSupported(ok);
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

  /** Put the transcript where the cursor was when the owner started speaking. */
  const insert = useCallback((text: string) => {
    if (!text) return;
    const el = targetRef.current;
    const pos = caret.current ?? { start: value.length, end: value.length };
    const before = value.slice(0, pos.start);
    const after = value.slice(pos.end);
    // Keep the sentence readable: a space where one is missing, never a double space.
    const glue = before && !/\s$/.test(before) ? " " : "";
    const tail = after && !/^\s/.test(after) ? " " : "";
    const next = `${before}${glue}${text}${tail}${after}`;
    onChange(next);
    const caretAt = (before + glue + text).length;
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(caretAt, caretAt);
    });
  }, [targetRef, value, onChange]);

  const transcribe = useCallback(async (blob: Blob) => {
    if (blob.size < 1200) return; // a tap, not speech
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("audio", new File([blob], "speech.webm", { type: blob.type || "audio/webm" }));
      const r = await fetch(`/api/projects/transcribe`, { method: "POST", body: fd });
      const d = (await r.json()) as { text?: string; error?: string };
      if (!r.ok) { toast.error(d.error ?? "Could not transcribe the recording."); return; }
      if (!d.text) { toast.info("Nothing was recognised — try again, closer to the microphone."); return; }
      insert(d.text);
    } finally { setBusy(false); }
  }, [insert]);

  const startRecording = useCallback(async () => {
    if (recording || busy || disabled || !supported) return;
    const el = targetRef.current;
    caret.current = el
      ? { start: el.selectionStart ?? value.length, end: el.selectionEnd ?? value.length }
      : { start: value.length, end: value.length };

    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("The microphone is not available", {
        description: "Allow microphone access in the browser, then hold the button again.",
      });
      return;
    }
    stream.current = media;
    chunks.current = [];

    const rec = new MediaRecorder(media);
    rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
    rec.onstop = () => { void transcribe(new Blob(chunks.current, { type: rec.mimeType || "audio/webm" })); };
    rec.start();
    recorder.current = rec;

    // The bars ARE the sound: one sample of the live loudness per tick, appended on the right.
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
      const rms = Math.sqrt(sum / buf.length);          // 0…1
      const h = Math.min(BAR_MAX, Math.max(BAR_MIN, Math.round(rms * 3 * BAR_MAX)));
      setBars((b) => [...b, h].slice(-maxBars.current));
    }, BAR_TICK_MS);

    clock.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }, [recording, busy, disabled, supported, targetRef, value, transcribe]);

  const stopRecording = useCallback(() => {
    if (!recording) return;
    setRecording(false);
    try { recorder.current?.stop(); } catch { /* already stopped */ }
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
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Button
        type="button"
        size="sm"
        variant={recording ? "destructive" : "outline"}
        disabled={disabled || busy || !supported}
        title={
          supported
            ? "Hold to speak — release to transcribe. The text lands where your cursor is."
            : "Voice input needs HTTPS (or localhost). Connect your domain to enable it — or dictate with your system keyboard."
        }
        // HOLD to record (owner's design): pointer events cover mouse, touch and pen in one path.
        onPointerDown={(e) => { e.preventDefault(); void startRecording(); }}
        onPointerUp={stopRecording}
        onPointerLeave={stopRecording}
        onPointerCancel={stopRecording}
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : supported ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
        {busy ? "Transcribing…" : recording ? "Recording…" : "Hold to speak"}
      </Button>

      {/* THE METER — 40px tall; bars 2px wide, 1px apart, up to 32px, appended left → right; the elapsed
          time sits in a 20px chip on an opaque backdrop in the centre. */}
      {recording && (
        <div
          ref={(el) => { if (el) maxBars.current = Math.max(16, Math.floor(el.clientWidth / (BAR_WIDTH + BAR_GAP))); }}
          className="relative h-10 flex-1 overflow-hidden rounded-md border bg-muted/40"
        >
          <div className="absolute inset-0 flex items-center" style={{ gap: `${BAR_GAP}px`, paddingInline: 2 }}>
            {bars.map((h, i) => (
              <span
                key={i}
                className="shrink-0 rounded-sm bg-primary/70"
                style={{ width: `${BAR_WIDTH}px`, height: `${h}px` }}
              />
            ))}
          </div>
          <span className="absolute left-1/2 top-1/2 flex h-5 -translate-x-1/2 -translate-y-1/2 items-center rounded bg-background px-2 text-[11px] font-medium tabular-nums text-foreground shadow-sm">
            {mm}:{ss}
          </span>
        </div>
      )}
    </div>
  );
}
