"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Pause, Send, SkipForward, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import VoiceInput from "../../../tools/voice-input/client/voice-input.client";

// СОЗДАНИЕ КЕЙСОВ С ИИ (v2-Quiz) — фокусный диалог фазы «пользовательские кейсы» из v1: владелец описывает
// сценарии (текст/голос), ИИ задаёт вопросы, АВТОКВИЗ вслух пишет черновик (стрим, редактируемый), и по
// «Создать кейсы» разговор синтезируется в пронумерованные кейсы В ЯДРО. Stateless: разговор держит клиент,
// сервер сессию не хранит; двери — тонкие `/api/projects/use-cases-quiz/*` (мозг в микросервисе).
//
// 🌐 i18n инлайн (en+ru, англ-фолбэк) — временно; десять языков (закон 4г) дозаполняются.
type Turn = { role: "user" | "assistant"; content: string };

const STR = {
  en: { title: "Describe the user cases", banner: "Planning is where the model's strength shows most — pick a strong model in the automation menu.", designer: "Designer", placeholder: "Describe your scenarios in your own words — voice works.", answer: "Answer", auto: "Auto-quiz", autoWriting: "The model is writing…", autoPaused: "Paused — edit the text, then keep it.", pause: "Pause", useText: "Keep this text", create: "Create the cases", loading: "Reading your instruction…", hint: "When the scenarios are clear, press «Create the cases» — the AI turns the conversation into numbered cases.", errStart: "Could not start.", errAuto: "Could not start the auto-quiz.", added: (n: number) => `${n} case${n === 1 ? "" : "s"} added.`, kept: "Kept as your description.", autoNeedsSeed: "First describe your scenarios in your own words in the field above and press «Answer». Auto-quiz then expands your description into cases — it has nothing to build on from a blank start." },
  ru: { title: "Опишите пользовательские кейсы", banner: "Планирование — там, где сила модели видна сильнее всего; выберите мощную модель в меню автоматизации.", designer: "Проектировщик", placeholder: "Опишите сценарии своими словами — можно голосом.", answer: "Ответить", auto: "Автоквиз", autoWriting: "Модель пишет…", autoPaused: "Пауза — поправьте текст и сохраните.", pause: "Пауза", useText: "Сохранить этот текст", create: "Создать кейсы", loading: "Читаю ваше задание…", hint: "Когда сценарии ясны, нажмите «Создать кейсы» — ИИ превратит разговор в пронумерованные кейсы.", errStart: "Не удалось начать.", errAuto: "Не удалось запустить автоквиз.", added: (n: number) => `Добавлено кейсов: ${n}.`, kept: "Сохранено как ваше описание.", autoNeedsSeed: "Сначала опишите сценарии своими словами в поле выше и нажмите «Ответить». Автоквиз развернёт ваше описание в кейсы — с пустого места ему не на чем строить." },
};
const strings = (lang: string) => STR[(lang.slice(0, 2) as keyof typeof STR)] ?? STR.en;

const API = "/api/projects/use-cases-quiz";
function automationFromPath(): string {
  if (typeof window === "undefined") return "";
  const p = window.location.pathname.split("?")[0].split("/").filter(Boolean);
  return p.length >= 3 && p[0] === "projects" ? `${p[1]}/${p[2]}` : "";
}

export function CreateQuiz({ open, lang, onClose, onApplied }: { open: boolean; lang: string; onClose: () => void; onApplied: () => void }) {
  const router = useRouter();
  const L = strings(lang);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [draft, setDraft] = useState("");
  const [aborter, setAborter] = useState<AbortController | null>(null);
  const booted = useRef(false);
  const answerRef = useRef<HTMLTextAreaElement | null>(null);

  const ask = useCallback(async (t: Turn[]) => {
    const r = await fetch(`${API}/ask`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ turns: t }) });
    const d = (await r.json()) as { question?: string; error?: string };
    if (!r.ok) { toast.error(d.error ?? L.errStart); return; }
    if (d.question) setTurns((prev) => [...prev, { role: "assistant", content: d.question! }]);
  }, [L]);

  // Открыли впервые — ИИ задаёт первый вопрос.
  useEffect(() => {
    if (!open) { booted.current = false; return; }
    if (booted.current) return;
    booted.current = true;
    setTurns([]); setAnswer(""); setDraft("");
    setBusy(true);
    void ask([]).finally(() => setBusy(false));
  }, [open, ask]);

  const send = useCallback(async () => {
    if (!answer.trim() || busy) return;
    const nt: Turn[] = [...turns, { role: "user", content: answer.trim() }];
    setAnswer(""); setTurns(nt); setBusy(true);
    try { await ask(nt); } finally { setBusy(false); }
  }, [answer, busy, turns, ask]);

  const autoQuiz = useCallback(async () => {
    if (streaming) return;
    // АВТОКВИЗ РАЗВОРАЧИВАЕТ ОПИСАНИЕ ВЛАДЕЛЬЦА В КЕЙСЫ, а не пишет с нуля (правка владельца 2026-07-26). Без
    // затравки (ни одного ответа владельца, ни текста в поле) ему нечего разворачивать — вышла бы
    // бессмыслица. Поэтому: нет затравки → ведём тостом «сначала опиши», НЕ запускаем. Есть текст в поле, но
    // не отправлен → подшиваем его в разговор, чтобы описание НЕ потерялось и попало в автоквиз.
    const seedTurns: Turn[] = answer.trim() ? [...turns, { role: "user", content: answer.trim() }] : turns;
    if (!seedTurns.some((t) => t.role === "user")) { toast.info(L.autoNeedsSeed, { duration: 8000 }); return; }
    if (answer.trim()) { setTurns(seedTurns); setAnswer(""); }
    setStreaming(true); setDraft("");
    const ctrl = new AbortController(); setAborter(ctrl);
    try {
      const r = await fetch(`${API}/auto`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ turns: seedTurns }), signal: ctrl.signal });
      if (!r.ok || !r.body) { toast.error(L.errAuto); return; }
      const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          const s = line.trim(); if (!s.startsWith("data:")) continue;
          const payload = s.slice(5).trim(); if (payload === "[DONE]") continue;
          try { const j = JSON.parse(payload) as { delta?: string }; if (j.delta) setDraft((t) => t + j.delta); } catch { /* partial */ }
        }
      }
    } catch { /* paused */ } finally { setStreaming(false); setAborter(null); }
  }, [streaming, turns, answer, L]);

  const useDraft = useCallback(() => {
    if (!draft.trim()) return;
    setTurns((prev) => [...prev, { role: "user", content: draft.trim() }]);
    setDraft(""); toast.success(L.kept);
  }, [draft, L]);

  const createCases = useCallback(async () => {
    if (busy || streaming) return;
    setBusy(true);
    try {
      const t: Turn[] = draft.trim() ? [...turns, { role: "user", content: draft.trim() }] : turns;
      const r = await fetch(`${API}/apply`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ automation: automationFromPath(), turns: t }) });
      const d = (await r.json()) as { added?: number; error?: string };
      if (!r.ok) { toast.error(d.error ?? L.errStart, { duration: 12000 }); return; }
      toast.success(L.added(d.added ?? 0));
      onApplied(); onClose(); router.refresh();
    } finally { setBusy(false); }
  }, [draft, turns, busy, streaming, onApplied, onClose, router, L]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !streaming && !busy) onClose(); }}>
      <DialogContent className="flex h-[600px] max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2"><Sparkles className="size-4" /> {L.title}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-3">
          <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /><p>{L.banner}</p>
          </div>
          {turns.length === 0 && busy && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> {L.loading}</p>
          )}
          {turns.map((t, i) => (
            <div key={i} className={`rounded-lg p-3 text-sm ${t.role === "user" ? "ml-8 bg-primary/10" : "mr-8 bg-muted"}`}>
              {t.role !== "user" && <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground"><Sparkles className="size-3" /> {L.designer}</p>}
              <p className="whitespace-pre-wrap">{t.content}</p>
            </div>
          ))}
        </div>

        {(streaming || draft) && (
          <div className="mx-6 max-h-[35vh] shrink-0 space-y-2 overflow-y-auto rounded-lg border border-primary/40 p-2">
            <p className="flex items-center gap-1 text-xs font-medium text-primary"><Sparkles className="size-3" /> {streaming ? L.autoWriting : L.autoPaused}</p>
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={7} className="text-sm" />
            {streaming ? (
              <Button size="sm" variant="outline" onClick={() => { aborter?.abort(); setStreaming(false); }}><Pause className="size-3.5" /> {L.pause}</Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={useDraft}><SkipForward className="size-3.5" /> {L.useText}</Button>
            )}
          </div>
        )}

        <div className="shrink-0 space-y-2 border-t px-6 pb-6 pt-3">
          <Textarea ref={answerRef} value={answer} onChange={(e) => setAnswer(e.target.value)} rows={3} className="max-h-40 overflow-y-auto" placeholder={L.placeholder} disabled={busy || streaming} />
          <VoiceInput targetRef={answerRef} value={answer} onChange={setAnswer} lang={lang} disabled={busy || streaming} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={send} disabled={busy || streaming || !answer.trim()}>{busy ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} {L.answer}</Button>
            <Button size="sm" variant="secondary" onClick={autoQuiz} disabled={busy || streaming}><Sparkles className="size-3.5" /> {L.auto}</Button>
            <Button size="sm" variant="outline" onClick={createCases} disabled={busy || streaming}><SkipForward className="size-3.5" /> {L.create}</Button>
          </div>
          <p className="text-xs text-muted-foreground">{L.hint}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
