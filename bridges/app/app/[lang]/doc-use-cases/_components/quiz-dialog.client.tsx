"use client";

// Quiz пользовательских кейсов — перенос из слоя проектов (`create-quiz.client.tsx`,
// коммит `ce54db6`), снесённого шагом 500.
//
// ЧТО ПЕРЕНЕСЕНО ДОСЛОВНО, потому что каждое куплено разбором провала:
//
// 1. Разговор держит КЛИЕНТ. Сервер сессию не хранит: автоквиз можно оборвать на
//    середине, а страницу перезагрузить, не оставив брошенных сессий.
// 2. Автоквиз РАЗВОРАЧИВАЕТ описание владельца, а не пишет с нуля. Без затравки
//    он отказывается и ГОВОРИТ ПОЧЕМУ (правка владельца 2026-07-26).
// 3. Автоквиз СТРИМИТСЯ, ставится на паузу и правится прямо в поле: владелец
//    читает пишущую модель и вмешивается, а не получает готовую простыню.
// 4. Текст, набранный в поле ответа и не отправленный, подшивается в разговор
//    перед автоквизом — иначе описание молча пропадало.
//
// Стенограмма уходит в `USE-CASES/RAW/` при синтезе: сырьё пишется всегда.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Sparkles, Pause, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import VoiceInput from "@/_tools/voice-input/client/voice-input.client";

type Turn = { role: "user" | "assistant"; content: string };

export type QuizLabels = {
  title: string; close: string;
  modelBanner: string;
  designer: string; placeholder: string; answer: string;
  auto: string; autoWriting: string; autoPaused: string; pause: string; keepText: string;
  create: string; creating: string;
  ready: string; hint: string;
  added: string; failed: string; noKey: string; noSeed: string;
};

export function QuizDialog(
  { open, lang, labels, onClose }:
  { open: boolean; lang: string; labels: QuizLabels; onClose: () => void },
) {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [draft, setDraft] = useState("");
  const [ready, setReady] = useState(false);
  const aborter = useRef<AbortController | null>(null);
  const booted = useRef(false);
  const field = useRef<HTMLTextAreaElement | null>(null);
  const draftField = useRef<HTMLTextAreaElement | null>(null);

  const call = useCallback(async (payload: Record<string, unknown>) => {
    const r = await fetch("/api/use-cases/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang, ...payload }),
      credentials: "include",
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (d?.error === "no-key") { toast.error(labels.noKey, { duration: 10000 }); return null; }
      if (d?.error === "no-seed") { toast.info(labels.noSeed, { duration: 8000 }); return null; }
      toast.error(String(d?.error ?? labels.failed));
      return null;
    }
    return d as Record<string, unknown>;
  }, [lang, labels]);

  const ask = useCallback(async (t: Turn[]) => {
    const d = await call({ mode: "ask", turns: t });
    if (!d) return;
    if (d.ready) { setReady(true); return; }
    if (typeof d.question === "string") setTurns((prev) => [...prev, { role: "assistant", content: d.question as string }]);
  }, [call]);

  // Открыли впервые — модель задаёт первый вопрос.
  useEffect(() => {
    if (!open) { booted.current = false; return; }
    if (booted.current) return;
    booted.current = true;
    setTurns([]); setAnswer(""); setDraft(""); setReady(false);
    setBusy(true);
    void ask([]).finally(() => setBusy(false));
  }, [open, ask]);

  async function send() {
    if (!answer.trim() || busy) return;
    const next: Turn[] = [...turns, { role: "user", content: answer.trim() }];
    setAnswer(""); setTurns(next); setBusy(true);
    try { await ask(next); } finally { setBusy(false); }
  }

  async function autoQuiz() {
    if (streaming) return;
    // Текст в поле, но не отправленный, подшивается в разговор — иначе описание
    // владельца молча теряется ровно в тот момент, когда оно нужнее всего.
    const seeded: Turn[] = answer.trim() ? [...turns, { role: "user", content: answer.trim() }] : turns;
    if (answer.trim()) { setTurns(seeded); setAnswer(""); }

    setStreaming(true); setDraft("");
    const ctrl = new AbortController(); aborter.current = ctrl;
    try {
      const r = await fetch("/api/use-cases/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "auto", lang, turns: seeded }),
        credentials: "include",
        signal: ctrl.signal,
      });
      if (!r.ok || !r.body) {
        const d = await r.json().catch(() => ({}));
        if (d?.error === "no-seed") toast.info(labels.noSeed, { duration: 8000 });
        else if (d?.error === "no-key") toast.error(labels.noKey, { duration: 10000 });
        else toast.error(labels.failed);
        return;
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const s = line.trim();
          if (!s.startsWith("data:")) continue;
          const payload = s.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
            const piece = j.choices?.[0]?.delta?.content;
            if (piece) setDraft((d0) => d0 + piece);
          } catch { /* кусок не JSON — пропускаем, стрим продолжается */ }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error(labels.failed);
    } finally {
      setStreaming(false);
      aborter.current = null;
    }
  }

  function pause() {
    aborter.current?.abort();
    setStreaming(false);
  }

  /** Черновик автоквиза становится репликой владельца — он его прочитал и принял. */
  function keepDraft() {
    if (!draft.trim()) return;
    setTurns((prev) => [...prev, { role: "user", content: draft.trim() }]);
    setDraft("");
  }

  async function create() {
    setBusy(true);
    try {
      const all: Turn[] = draft.trim() ? [...turns, { role: "user", content: draft.trim() }] : turns;
      const d = await call({ mode: "synthesize", turns: all });
      if (!d) return;
      const cases = (d.cases ?? []) as { title: string; summary: string }[];
      if (!cases.length) { toast.error(labels.failed); return; }
      const r = await fetch("/api/use-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "append", cases }),
        credentials: "include",
      });
      if (!r.ok) { toast.error(labels.failed); return; }
      toast.success(labels.added.replace("{n}", String(cases.length)));
      onClose();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="mt-8 w-full max-w-2xl rounded-lg border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <p className="text-[12px] font-medium text-foreground">{labels.title}</p>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3 p-4">
          {/* Врезка про модель — перенесена из старого Quiz: планирование сильнее
              всего зависит от модели, и человек должен знать, какой он сейчас
              пользуется. */}
          <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">
            {labels.modelBanner}
          </p>

          <div className="max-h-64 space-y-2 overflow-y-auto">
            {turns.map((t, i) => (
              <div key={i} className={t.role === "assistant" ? "" : "pl-6"}>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {t.role === "assistant" ? labels.designer : ""}
                </p>
                <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-foreground">{t.content}</p>
              </div>
            ))}
            {busy && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
          </div>

          {ready && (
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-[11px] text-emerald-700 dark:text-emerald-300">
              {labels.ready}
            </p>
          )}

          {/* Черновик автоквиза: он ПРАВИТСЯ прямо здесь, пока модель пишет. */}
          {(streaming || draft) && (
            <div className="rounded-md border border-border p-2.5">
              <p className="mb-1 text-[10px] text-muted-foreground">
                {streaming ? labels.autoWriting : labels.autoPaused}
              </p>
              <textarea
                ref={draftField}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={8}
                className="w-full rounded-md border border-border bg-background p-2 text-[11px] leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="mt-2 flex items-center gap-2">
                {streaming ? (
                  <Button size="sm" variant="outline" className="text-[11px]" onClick={pause}>
                    <Pause size={11} />{labels.pause}
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="text-[11px]" onClick={keepDraft}>
                    <Check size={11} />{labels.keepText}
                  </Button>
                )}
              </div>
            </div>
          )}

          <textarea
            ref={field}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={labels.placeholder}
            rows={3}
            className="w-full rounded-md border border-border bg-background p-2.5 text-[12px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <div className="flex flex-wrap items-center gap-2">
            <VoiceInput targetRef={field} value={answer} onChange={setAnswer} lang={lang} apiUrl="/api/transcribe" />
            <Button size="sm" className="text-[11px]" onClick={send} disabled={busy || !answer.trim()}>
              <Send size={11} />{labels.answer}
            </Button>
            <Button size="sm" variant="outline" className="text-[11px]" onClick={autoQuiz} disabled={streaming}>
              <Sparkles size={11} />{labels.auto}
            </Button>
            <span className="flex-1" />
            <Button size="sm" className="text-[11px]" onClick={create} disabled={busy}>
              {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              {busy ? labels.creating : labels.create}
            </Button>
          </div>

          <p className="text-[10px] leading-relaxed text-muted-foreground">{labels.hint}</p>
        </div>
      </div>
    </div>
  );
}
