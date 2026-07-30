"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles as SparkleIcon, Loader2, Send, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { chromeStrings } from "./i18n";
import VoiceInput from "../tools/voice-input/client/voice-input.client";

// МОДАЛКА «КАК ЭТО РАБОТАЕТ» (сервис, шаг 302). Открывается ТОЛЬКО для реальной автоматизации — замороженный
// тест-шаблон гейтится тостом в меню. ЕДИНЫЙ ИСТОЧНИК ИСТИНЫ — `passport.howItWorks` в `automation.json`
// (решение владельца): читаем его через `api/core?select=passport`, пишем через `api/patch` (каноничная
// запись ядра `writeCore`, как «Отправить задание»). Два состояния:
//   • `howItWorks` пуст (свежий клон: birth сбрасывает его в []) → приглашение + «Получить ответ» + форма
//     уточняющего вопроса (текст + голос); модель читает СНИМОК ядра и пишет объяснение ≈200 слов;
//   • `howItWorks` есть → показываем ответ, под ним снова форму уточнения — новый ответ ПЕРЕЗАПИШЕТ старый.
// Ключ ИИ — сервер-сайд (дверь `generate`), через меня не проходит.
const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";
function automationFromPath(): string {
  if (typeof window === "undefined") return "";
  const p = location.pathname.split("?")[0].split("/").filter(Boolean);
  return p.length >= 3 && p[0] === "projects" ? `${p[1]}/${p[2]}` : "";
}
/** Ответ модели → массив абзацев для `passport.howItWorks` (схема: массив непустых строк). */
const toParagraphs = (text: string): string[] => {
  const parts = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : [text.trim()];
};

export default function HowItWorksModal({ lang, open, onClose }: { lang: string; open: boolean; onClose: () => void }) {
  const L = chromeStrings(lang);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qRef = useRef<HTMLTextAreaElement | null>(null);

  // Читаем сохранённый ответ из ядра при открытии.
  useEffect(() => {
    if (!open) return;
    setLoaded(false); setError(null); setQuestion("");
    fetch(`${apiBase()}/core?select=passport`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { howItWorks?: unknown } | null) => {
        const arr = Array.isArray(d?.howItWorks) ? (d!.howItWorks as string[]) : [];
        setAnswer(arr.length ? arr.join("\n\n") : null);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [open]);

  // Снимок текущего ядра → модель (≈200 слов; `prompt` фокусирует) → пишем результат в `passport.howItWorks`
  // через `api/patch` (единый источник в automation.json). Новый ответ перезаписывает старый.
  async function generate() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const core = await fetch(`${apiBase()}/core`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      const g = await fetch(`/api/projects/how-it-works/generate`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ automation: automationFromPath(), collected: core, prompt: question.trim() || undefined }),
      });
      const gd = (await g.json().catch(() => ({}))) as { ok?: boolean; result?: { text?: string }; error?: string };
      if (!g.ok || !gd.ok || !gd.result?.text) { setError(gd.error ?? L.howItWorksFail); return; }
      const text = gd.result.text;
      const p = await fetch(`${apiBase()}/patch`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: { object: "passport" }, set: { howItWorks: toParagraphs(text) } }),
      });
      if (!p.ok) { setError(L.howItWorksFail); return; }
      setAnswer(text);
      setQuestion("");
    } finally { setBusy(false); }
  }

  // Одна форма на оба состояния: без ответа кнопка = «Получить ответ», с ответом = «Отправить вопрос».
  const askForm = (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{answer ? L.howItWorksRefineHint : L.howItWorksAskHint}</p>
      <Textarea
        ref={qRef}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder={L.howItWorksAskPlaceholder}
        className="min-h-16 resize-y text-sm"
        disabled={busy}
      />
      <div className="flex items-center justify-between gap-2">
        <VoiceInput targetRef={qRef} value={question} onChange={setQuestion} lang={lang} disabled={busy} />
        <Button size="sm" onClick={generate} disabled={busy} className="gap-1.5">
          {busy ? <Loader2 className="size-4 animate-spin" /> : answer ? <Send className="size-4" /> : <Wand2 className="size-4" />}
          {answer ? L.howItWorksAskSend : L.howItWorksGet}
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <DialogContent className="flex max-h-[600px] flex-col overflow-hidden sm:max-w-[600px]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <SparkleIcon className="size-4" /> {L.howItWorks}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          {!loaded ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {L.howItWorksLoading}
            </p>
          ) : answer ? (
            <>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{answer}</div>
              {askForm}
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{L.howItWorksIntro}</p>
              {askForm}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
