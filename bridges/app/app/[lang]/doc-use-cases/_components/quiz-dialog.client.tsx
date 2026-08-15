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
import { Loader2, Send, Sparkles, Pause, Check, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import VoiceInput from "@/_tools/voice-input/client/voice-input.client";
import { parseRound, explainQuizError } from "@/lib/quiz-brain.shared";

type Turn = { role: "user" | "assistant"; content: string };

export type QuizLabels = {
  title: string; close: string;
  modelBanner: string;
  designer: string; placeholder: string; answer: string;
  auto: string; autoAgain: string; autoWriting: string; autoPaused: string; pause: string; keepText: string;
  autoAssumption: string; autoAccepted: string;
  create: string; creating: string; or: string;
  ready: string; hint: string;
  added: string; failed: string; noKey: string; noSeed: string;
  scrollDown: string;
  // 🔒 ПРИЧИНА ОТКАЗА НАЗЫВАЕТСЯ (владелец 2026-08-14: «ключ устарел? ключа нет?
  // я не понимаю проблему»). Одно слово «Не удалось» стояло на четырёх разных
  // бедах, за каждой из которых своё действие владельца.
  errKeyRejected: string; errQuota: string; errRateLimit: string;
  errModelMissing: string; errUpstream: string;
  errNoCases: string; errSaveFailed: string;
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

  // «К последнему сообщению» — перенос из старого Quiz (коммит `8e04170`).
  //
  // ЗАЧЕМ. Новый вопрос приходит НИЖЕ видимой части, лента визуально не двигается,
  // и человек его просто не замечает: смотрит на пустое поле ответа и думает, что
  // ничего не произошло. Поэтому: был внизу — держим внизу; ушёл читать выше —
  // показываем подпрыгивающую стрелку, а не дёргаем ленту у него из-под курсора.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const nearBottom = () => {
    const el = scrollRef.current;
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };
  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };
  useEffect(() => {
    if (nearBottom()) scrollToBottom();
    else setShowScrollDown(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turns, draft, streaming, busy]);

  // Одна формулировка отказа на все поверхности — она же у правки кейса на доске.
  const explain = useCallback(
    (code: string, detail?: unknown) => explainQuizError(code, detail, labels),
    [labels],
  );

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
      // Отказ живёт на экране дольше обычного: его читают, а не замечают.
      toast.error(explain(String(d?.error ?? ""), d?.detail), { duration: 15000 });
      return null;
    }
    return d as Record<string, unknown>;
  }, [lang, labels, explain]);

  const ask = useCallback(async (t: Turn[]) => {
    const d = await call({ mode: "ask", turns: t });
    if (!d) return;
    if (d.ready) { setReady(true); return; }
    if (typeof d.question === "string") setTurns((prev) => [...prev, { role: "assistant", content: d.question as string }]);
  }, [call]);

  // 🔒 QUIZ ПРОДОЛЖАЕТСЯ, А НЕ НАЧИНАЕТСЯ ЗАНОВО (правка 2026-08-10). Владелец
  // описал свой сценарий прямо: отвечать «сколько выдержу», устать, нажать
  // автоквиз — и получить кейсы ЛУЧШЕ, чем если бы остановился на пятом вопросе.
  // Значит накопленное обязано пережить закрытие окна: при открытии поднимаем
  // ленту с сервера, и автоквиз с синтезом видят её целиком.
  useEffect(() => {
    if (!open) { booted.current = false; return; }
    if (booted.current) return;
    booted.current = true;
    setAnswer(""); setDraft(""); setReady(false);
    setBusy(true);
    (async () => {
      let prior: Turn[] = [];
      try {
        const r = await fetch("/api/use-cases", { cache: "no-store", credentials: "include" });
        const d = await r.json().catch(() => ({}));
        if (Array.isArray(d?.turns)) prior = d.turns as Turn[];
      } catch { /* не подняли — начнём с чистого, это хуже, но не поломка */ }
      setTurns(prior);
      await ask(prior);
    })().finally(() => setBusy(false));
  }, [open, ask]);

  /** Дописать реплики в ленту проекта. Тихо: это сохранение, а не действие. */
  async function persist(items: Turn[], note?: string) {
    if (!items.length) return;
    try {
      await fetch("/api/use-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "raw", turns: items, note }),
        credentials: "include",
      });
    } catch { /* не сохранили — разговор в окне продолжается */ }
  }

  async function send() {
    if (!answer.trim() || busy) return;
    const mine: Turn = { role: "user", content: answer.trim() };
    const next: Turn[] = [...turns, mine];
    setAnswer(""); setTurns(next); setBusy(true);
    // Сохраняем ПОСЛЕ КАЖДОГО ответа: окно вправе закрыться на середине.
    void persist([mine]);
    try {
      const before = next.length;
      await ask(next);
      setTurns((cur) => {
        const asked = cur[before];
        if (asked?.role === "assistant") void persist([asked]);
        return cur;
      });
    } finally { setBusy(false); }
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
        else toast.error(explain(String(d?.error ?? ""), d?.detail), { duration: 15000 });
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

  /**
   * Принять круг автоквиза.
   *
   * Круг разбирается на ПАРЫ и ложится в ленту как настоящие вопросы и ответы —
   * иначе следующий круг не увидит, о чём уже спрашивали, и пойдёт по второму
   * разу. Ответ становится репликой владельца потому, что он его прочитал и
   * принял; непрочитанным он в ленту не попадает никогда.
   */
  function keepDraft() {
    if (!draft.trim()) return;
    const pairs = parseRound(draft);
    const added: Turn[] = pairs.length
      ? pairs.flatMap((x) => ([
          { role: "assistant" as const, content: x.question },
          { role: "user" as const, content: x.answer },
        ]))
      // Формат не распознан — не теряем текст: он уходит одной репликой.
      : [{ role: "user" as const, content: draft.trim() }];
    setTurns((prev) => [...prev, ...added]);
    void persist(added, "автоквиз: принятый круг");
    setDraft("");
    toast.success(labels.autoAccepted.replace("{n}", String(pairs.length || 1)));
  }

  async function create() {
    setBusy(true);
    try {
      const all: Turn[] = draft.trim() ? [...turns, { role: "user", content: draft.trim() }] : turns;
      const d = await call({ mode: "synthesize", turns: all });
      if (!d) return;
      const cases = (d.cases ?? []) as { title: string; summary: string }[];
      // 🔒 ПУСТОЙ РЕЗУЛЬТАТ — НЕ ПОЛОМКА, А ПУСТОЙ РАЗГОВОР (владелец 2026-08-14).
      //
      // Модель ответила и ответила честно: из разговора, в котором ничего не
      // сказано, кейсов не выводится. Раньше это показывалось тем же «Не
      // удалось», что и отказ ключа, — и владелец шёл проверять ключ, который
      // работает. Здесь называется настоящая причина и следующий шаг.
      if (!cases.length) { toast.error(labels.errNoCases, { duration: 12000 }); return; }
      const r = await fetch("/api/use-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Язык едет с кейсами: на нём модель назовёт продукт и опишет его
        // страницы. Панель знает язык из адреса, сервер — нет.
        body: JSON.stringify({ op: "append", cases, lang }),
        credentials: "include",
      });
      if (!r.ok) {
        // Модель отработала, кейсы есть, а записать их не вышло — это отдельная
        // беда с отдельным лечением, и путать её с отказом модели нельзя.
        const err = await r.json().catch(() => ({}));
        const why = typeof err?.error === "string" ? ` — ${err.error}` : "";
        toast.error(`${labels.errSaveFailed}${why}`, { duration: 12000 });
        return;
      }
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

          {/* Обёртка относительная: стрелка стоит НАД лентой и не уезжает вместе
              с ней. */}
          <div className="relative">
            <div
              ref={scrollRef}
              onScroll={() => setShowScrollDown(!nearBottom())}
              className="max-h-72 space-y-2 overflow-y-auto pr-1"
            >
              {turns.map((t, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-2.5 text-[12px] leading-relaxed ${
                    t.role === "user" ? "ml-8 bg-primary/10 text-foreground" : "mr-8 bg-muted text-foreground"
                  }`}
                >
                  {t.role !== "user" && (
                    <p className="mb-1 flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                      <Sparkles size={10} />{labels.designer}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{t.content}</p>
                </div>
              ))}
              {busy && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
            </div>

            {showScrollDown && (
              <button
                type="button"
                onClick={scrollToBottom}
                aria-label={labels.scrollDown}
                title={labels.scrollDown}
                className="absolute bottom-2 left-1/2 flex size-8 -translate-x-1/2 animate-bounce items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-md backdrop-blur transition-colors hover:bg-muted"
              >
                <ChevronDown size={16} />
              </button>
            )}
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
              {/* Модель отвечает ЗА владельца, значит неизбежно предполагает.
                  Помеченную догадку он поправит; непомеченная станет фактом,
                  которого никто не выбирал. */}
              {!streaming && draft && (
                <p className="mb-1 text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">
                  {labels.autoAssumption}
                </p>
              )}
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

          {/* Голос — рядом с полем, а не среди действий: он ПИШЕТ в поле, а не
              решает, что делать дальше. */}
          <div className="flex items-center">
            <VoiceInput targetRef={field} value={answer} onChange={setAnswer} lang={lang} apiUrl="/api/transcribe" />
          </div>

          {/* РАЗВИЛКА, а не набор кнопок (владелец 2026-08-10): две равные
              половины со словом «или» между ними. Человек в этот момент делает
              ровно один выбор — ответить самому или дать модели развернуть уже
              сказанное, — и раскладка обязана этот выбор показывать. */}
          <div className="flex items-stretch gap-2">
            <Button
              size="sm"
              className="h-9 flex-1 text-[11px]"
              onClick={send}
              disabled={busy || !answer.trim()}
            >
              <Send size={11} />{labels.answer}
            </Button>
            <span className="self-center text-[10px] uppercase tracking-wide text-muted-foreground">
              {labels.or}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-9 flex-1 text-[11px]"
              onClick={autoQuiz}
              disabled={streaming}
            >
              <Sparkles size={11} />{turns.length > 1 ? labels.autoAgain : labels.auto}
            </Button>
          </div>

          {/* Завершение опроса — ОТДЕЛЬНОЙ строкой во всю ширину: это выход из
              разговора, а не третий равный вариант ответа. */}
          <Button size="sm" className="h-9 w-full text-[11px]" onClick={create} disabled={busy}>
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            {busy ? labels.creating : labels.create}
          </Button>

          <p className="text-[10px] leading-relaxed text-muted-foreground">{labels.hint}</p>
        </div>
      </div>
    </div>
  );
}
