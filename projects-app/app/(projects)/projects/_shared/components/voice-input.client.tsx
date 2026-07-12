"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useUiLang } from "../use-ui-lang";

// SIX-LANGUAGE UI (CLAUDE.md 4г) — the button, its tooltip and every toast this primitive shows are
// translated for the six languages we ship; anything else falls back to English.
type ViStrings = {
  hold: string; recording: string; transcribing: string;
  tipOk: string; tipInsecure: string;
  micUnavailable: string; micDenied: string; micDeniedDesc: string; micNoDevice: string;
  failed: string; nothing: string; noKey: string;
  // The AMBER (not red) frame toast: shown when voice fails INSIDE the admin preview iframe — the fix is
  // to open the page on its own, so this toast offers exactly that.
  frameTitle: string; frameDesc: string; openTab: string; cancel: string;
};
const VI_I18N: Record<string, ViStrings> = {
  en: {
    hold: "Hold to speak", recording: "Recording…", transcribing: "Transcribing…",
    tipOk: "Hold to speak — release to transcribe. The text lands where your cursor is.",
    tipInsecure: "Voice input needs HTTPS (or localhost). Connect your domain to enable it — or dictate with your system keyboard.",
    micUnavailable: "The microphone is not available",
    micDenied: "Microphone access is blocked", micDeniedDesc: "Allow the microphone for this site in the browser, then hold the button again.",
    micNoDevice: "No microphone was found on this device.",
    failed: "Could not transcribe the recording.", nothing: "Nothing was recognised — try again, closer to the microphone.",
    noKey: "Voice input needs the OpenAI key — add it in the workspace settings.",
    frameTitle: "Voice needs the page on its own",
    frameDesc: "You are inside the admin preview, where the browser blocks the microphone. Open this page in its own tab to record.",
    openTab: "Open in a new tab", cancel: "Cancel",
  },
  ru: {
    hold: "Удерживайте для речи", recording: "Идёт запись…", transcribing: "Расшифровка…",
    tipOk: "Удерживайте, чтобы говорить; отпустите — расшифрую. Текст встанет туда, где курсор.",
    tipInsecure: "Голосовому вводу нужен HTTPS (или localhost). Подключите домен — или диктуйте системной клавиатурой.",
    micUnavailable: "Микрофон недоступен",
    micDenied: "Доступ к микрофону заблокирован", micDeniedDesc: "Разрешите микрофон для этого сайта в браузере и снова удерживайте кнопку.",
    micNoDevice: "На этом устройстве не найден микрофон.",
    failed: "Не удалось расшифровать запись.", nothing: "Ничего не распознано — попробуйте ещё раз, ближе к микрофону.",
    noKey: "Для голосового ввода нужен ключ OpenAI — добавьте его в настройках рабочего пространства.",
    frameTitle: "Голосу нужна отдельная вкладка",
    frameDesc: "Вы в окне предпросмотра админки — здесь браузер блокирует микрофон. Откройте эту страницу в отдельной вкладке, чтобы записать голос.",
    openTab: "Открыть в новой вкладке", cancel: "Отмена",
  },
  es: {
    hold: "Mantén para hablar", recording: "Grabando…", transcribing: "Transcribiendo…",
    tipOk: "Mantén pulsado para hablar; suelta para transcribir. El texto va donde está el cursor.",
    tipInsecure: "La entrada de voz necesita HTTPS (o localhost). Conecta tu dominio para activarla — o dicta con el teclado del sistema.",
    micUnavailable: "El micrófono no está disponible",
    micDenied: "El acceso al micrófono está bloqueado", micDeniedDesc: "Permite el micrófono para este sitio en el navegador y vuelve a mantener el botón.",
    micNoDevice: "No se encontró ningún micrófono en este dispositivo.",
    failed: "No se pudo transcribir la grabación.", nothing: "No se reconoció nada — inténtalo de nuevo, más cerca del micrófono.",
    noKey: "La entrada de voz necesita la clave de OpenAI — añádela en los ajustes del espacio de trabajo.",
    frameTitle: "La voz necesita su propia pestaña",
    frameDesc: "Estás dentro de la vista previa del administrador, donde el navegador bloquea el micrófono. Abre esta página en su propia pestaña para grabar.",
    openTab: "Abrir en una pestaña nueva", cancel: "Cancelar",
  },
  fr: {
    hold: "Maintenez pour parler", recording: "Enregistrement…", transcribing: "Transcription…",
    tipOk: "Maintenez pour parler ; relâchez pour transcrire. Le texte arrive à l'emplacement du curseur.",
    tipInsecure: "La saisie vocale nécessite HTTPS (ou localhost). Connectez votre domaine pour l'activer — ou dictez avec le clavier du système.",
    micUnavailable: "Le microphone n'est pas disponible",
    micDenied: "L'accès au microphone est bloqué", micDeniedDesc: "Autorisez le microphone pour ce site dans le navigateur, puis maintenez à nouveau le bouton.",
    micNoDevice: "Aucun microphone n'a été trouvé sur cet appareil.",
    failed: "Impossible de transcrire l'enregistrement.", nothing: "Rien n'a été reconnu — réessayez, plus près du micro.",
    noKey: "La saisie vocale nécessite la clé OpenAI — ajoutez-la dans les paramètres de l'espace de travail.",
    frameTitle: "La voix a besoin de son propre onglet",
    frameDesc: "Vous êtes dans l'aperçu de l'admin, où le navigateur bloque le micro. Ouvrez cette page dans son propre onglet pour enregistrer.",
    openTab: "Ouvrir dans un nouvel onglet", cancel: "Annuler",
  },
  it: {
    hold: "Tieni premuto per parlare", recording: "Registrazione…", transcribing: "Trascrizione…",
    tipOk: "Tieni premuto per parlare; rilascia per trascrivere. Il testo va dove si trova il cursore.",
    tipInsecure: "L'input vocale richiede HTTPS (o localhost). Collega il tuo dominio per abilitarlo — oppure detta con la tastiera di sistema.",
    micUnavailable: "Il microfono non è disponibile",
    micDenied: "L'accesso al microfono è bloccato", micDeniedDesc: "Consenti il microfono per questo sito nel browser, poi tieni premuto di nuovo il pulsante.",
    micNoDevice: "Nessun microfono trovato su questo dispositivo.",
    failed: "Impossibile trascrivere la registrazione.", nothing: "Non è stato riconosciuto nulla — riprova, più vicino al microfono.",
    noKey: "L'input vocale richiede la chiave OpenAI — aggiungila nelle impostazioni dello spazio di lavoro.",
    frameTitle: "La voce ha bisogno di una scheda propria",
    frameDesc: "Sei dentro l'anteprima dell'admin, dove il browser blocca il microfono. Apri questa pagina in una scheda propria per registrare.",
    openTab: "Apri in una nuova scheda", cancel: "Annulla",
  },
  de: {
    hold: "Zum Sprechen halten", recording: "Aufnahme…", transcribing: "Transkription…",
    tipOk: "Zum Sprechen gedrückt halten; loslassen zum Transkribieren. Der Text landet an der Cursorposition.",
    tipInsecure: "Spracheingabe braucht HTTPS (oder localhost). Verbinde deine Domain, um sie zu aktivieren — oder diktiere mit der Systemtastatur.",
    micUnavailable: "Das Mikrofon ist nicht verfügbar",
    micDenied: "Der Mikrofonzugriff ist blockiert", micDeniedDesc: "Erlaube das Mikrofon für diese Seite im Browser und halte die Taste erneut gedrückt.",
    micNoDevice: "Auf diesem Gerät wurde kein Mikrofon gefunden.",
    failed: "Die Aufnahme konnte nicht transkribiert werden.", nothing: "Nichts erkannt — versuch es erneut, näher am Mikrofon.",
    noKey: "Spracheingabe braucht den OpenAI-Schlüssel — füge ihn in den Workspace-Einstellungen hinzu.",
    frameTitle: "Die Stimme braucht einen eigenen Tab",
    frameDesc: "Du bist in der Admin-Vorschau, in der der Browser das Mikrofon blockiert. Öffne diese Seite in einem eigenen Tab, um aufzunehmen.",
    openTab: "In neuem Tab öffnen", cancel: "Abbrechen",
  },
};

/** True when we are running inside a frame (the admin preview) — the reference comparison is allowed even
 *  cross-origin. Voice cannot record here without the page opened on its own. */
function inFrame(): boolean {
  try { return window.self !== window.top; } catch { return true; }
}

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
  const lang = useUiLang();
  const L = VI_I18N[lang] ?? VI_I18N.en;
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
      const d = (await r.json()) as { text?: string; error?: string; reason?: string };
      if (!r.ok) { toast.error(d.reason === "no-key" ? L.noKey : L.failed); return; }
      if (!d.text) { toast.info(L.nothing); return; }
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
    } catch (e) {
      const name = (e as { name?: string })?.name ?? "";
      if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        // No hardware — opening a new tab would not help, so this stays a red error in any context.
        toast.error(L.micUnavailable, { description: L.micNoDevice });
      } else if (inFrame()) {
        // The likely cause inside the admin preview: a cross-origin frame the browser refuses the mic in.
        // AMBER (not red) — it is not a real failure, it is a "do it on its own page" nudge, with the fix
        // one click away: open the exact current page in a new tab, and ask the preview window to close.
        toast.warning(L.frameTitle, {
          description: L.frameDesc,
          duration: 20000,
          action: {
            label: L.openTab,
            onClick: () => {
              window.open(window.location.href, "_blank", "noopener");
              try { window.parent?.postMessage({ type: "fractera:preview-close" }, "*"); } catch { /* not framed */ }
            },
          },
          cancel: { label: L.cancel, onClick: () => {} },
        });
      } else {
        // A real denial on a full-page tab — tell the owner to allow the mic for this site.
        toast.error(L.micDenied, { description: L.micDeniedDesc });
      }
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
        title={supported ? L.tipOk : L.tipInsecure}
        // HOLD to record (owner's design): pointer events cover mouse, touch and pen in one path.
        onPointerDown={(e) => { e.preventDefault(); void startRecording(); }}
        onPointerUp={stopRecording}
        onPointerLeave={stopRecording}
        onPointerCancel={stopRecording}
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : supported ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
        {busy ? L.transcribing : recording ? L.recording : L.hold}
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
