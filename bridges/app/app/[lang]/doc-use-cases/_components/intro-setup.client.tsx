"use client";

// Экран ДО опроса: владелец правит сами вопросы (владелец 2026-08-14).
//
// 🔒 ЗАЧЕМ ОН ПОЯВИЛСЯ. Семь вводных вопросов были зашиты в словарь панели и
// задавались одинаково интернет-магазину и клинике. Но вопрос — половина ответа:
// неверный заставляет человека описывать не тот продукт, который у него в
// голове, и весь дальнейший Quiz идёт по чужой колее. Заметить это в конце,
// глядя на кейсы, уже поздно — переписывать придётся всё.
//
// Поэтому список показывается ПЕРЕД опросом: видно, о чём спросят, и каждый
// вопрос можно переписать, продиктовать, удалить или добавить свой.
//
// 🔒 ПОКАЗЫВАЕМ СЕМЬ, А НЕ ВЕСЬ СПИСОК (владелец 2026-08-17). У направлений от 15
// до 30 вопросов. Простыня из тридцати не читается — она отпугивает ровно того,
// кто пришёл описать продукт впервые, и человек либо уходит, либо отвечает
// односложно на всё подряд. Семь первых — те, без которых кейсы нельзя разложить
// в шаги разработки; на них одних опрос уже состоятелен.
//
// Остальные не спрятаны, а ОТЛОЖЕНЫ: под семёркой стоит согласие на подробный
// опрос, а в раскрытом виде — обратный ход. Решает человек, и решает дважды.
//
// 🔒 В ОПРОС УХОДИТ РОВНО ТО, ЧТО ВИДНО. Свёрнутый список отправляет семь
// вопросов, раскрытый — все. Иначе «согласен на семь» означало бы тридцать
// вопросов, просто показанных не сразу, — то есть обман в чистом виде.
//
// Утверждённый список уезжает файлом в папку проекта (`USE-CASES/RAW/
// questions.json`) — он едет в репозиторий вместе с кейсами, и агент видит, о чём
// владельца спрашивали.

import { useRef, useState } from "react";
import { productParam } from "./product-param";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, ArrowRight, RotateCcw, Mic, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import VoiceInput from "@/_tools/voice-input/client/voice-input.client";

export type SetupLabels = {
  lead: string;
  hint: string;
  /** «Править необязательно — можно начинать сразу». */
  skip: string;
  add: string;
  removeOne: string;
  restore: string;
  restored: string;
  start: string;
  saving: string;
  failed: string;
  atLeastOne: string;
  placeholder: string;
  voiceFor: string;
  voiceClose: string;
  count: string;
  /** «Согласен на более полный опрос» + сколько вопросов за этим стоит. */
  more: string;
  moreHint: string;
  /** Обратный ход из раскрытого списка. */
  fewer: string;
};

/**
 * Сколько вопросов видно, пока владелец не согласился на подробный опрос.
 *
 * 🔒 ЧИСЛО ЖИВЁТ ЗДЕСЬ, А НЕ В СЛОВАРЕ И НЕ В ДАННЫХ НАПРАВЛЕНИЯ. Оно одинаково
 * для всех двадцати одного направления по замыслу: первые семь вопросов каждого
 * списка отобраны так, чтобы кейсы можно было разложить в шаги разработки. Дай
 * направлению право назвать своё число — и отбор перестанет быть общим правилом,
 * а станет двадцатью одной отдельной договорённостью.
 */
const CORE = 7;

export function IntroSetup(
  { suggested, lang, labels }: { suggested: string[]; lang: string; labels: SetupLabels },
) {
  const router = useRouter();
  const [items, setItems] = useState<string[]>(() => (suggested.length ? [...suggested] : [""]));
  // 🔒 ВЫКЛЮЧАТЕЛЬ СБРАСЫВАЕТСЯ ВМЕСТЕ СО СПИСКОМ, и это даёт ключ на странице
  // (`key={pid}:{type}`): сменил направление — снова видишь его семь, а не
  // раскрытые тридцать от прошлого выбора.
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  // Голос открывается ДЛЯ ОДНОГО вопроса. Держать микрофон у каждой строки
  // значило бы поставить рядом семь записывающих кнопок — вместо инструмента
  // получился бы шум.
  const [voiceAt, setVoiceAt] = useState<number | null>(null);
  const voiceField = useRef<HTMLTextAreaElement | null>(null);

  // Сколько строк на экране сейчас. Свёрнутый список короче списка целиком —
  // и всё, что ниже, считает именно эту границу, а не длину массива.
  const shown = expanded ? items.length : Math.min(CORE, items.length);
  const hidden = items.length - shown;
  const visible = items.slice(0, shown);

  const setAt = (i: number, v: string) => setItems((prev) => prev.map((q, k) => (k === i ? v : q)));
  const removeAt = (i: number) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, k) => k !== i) : prev));
    setVoiceAt(null);
  };
  // 🔒 СВОЙ ВОПРОС ВСТАЁТ ПОСЛЕДНИМ ВИДИМЫМ, А НЕ В КОНЕЦ МАССИВА. Дописанный в
  // конец свёрнутого списка он ушёл бы за границу семи: владелец сформулировал
  // вопрос, нажал «добавить» и не увидел ни строки, а в опрос тот бы не попал.
  const addOne = () => setItems((prev) => [...prev.slice(0, shown), "", ...prev.slice(shown)]);

  async function start() {
    // В опрос уходит РОВНО видимое: свёрнутый список — семь вопросов, раскрытый —
    // все. Отправить скрытые значило бы отменить выбор, который человек только
    // что сделал нажатием.
    const clean = visible.map((q) => q.trim()).filter(Boolean);
    if (!clean.length) { toast.error(labels.atLeastOne); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/use-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: productParam(), op: "questions", questions: clean }),
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(String(d?.error ?? labels.failed));
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
      setBusy(false);
    }
  }

  // 🔒 КНОПКА «НАЧАТЬ ОПРОС» СТОИТ ДВАЖДЫ, СВЕРХУ И СНИЗУ (владелец 2026-08-16).
  //
  // Вопросов может быть сколько угодно — их добавляет сам владелец, — и при
  // семи-восьми единственная кнопка внизу уезжает за край экрана. Человек видит
  // список, не видит выхода из него и не понимает, что делать дальше. Дефект тем
  // и коварен, что на списке из одного вопроса его нет вовсе: он появляется
  // ровно у тех, кто дал себе труд вопросы дописать.
  //
  // 🔒 ОДНА И ТА ЖЕ КНОПКА, А НЕ ДВЕ ПОХОЖИХ. Обе зовут `start`, обе гаснут на
  // время сохранения, обе носят одну подпись из словаря. Скопируй разметку — и
  // однажды верхняя останется активной, пока нижняя уже работает, то есть
  // отправит вторую заявку по второму нажатию.
  const startButton = (
    <Button size="sm" className="text-[11px]" onClick={start} disabled={busy}>
      {busy ? <Loader2 size={11} className="animate-spin" /> : <ArrowRight size={11} />}
      {busy ? labels.saving : labels.start}
    </Button>
  );

  return (
    <div className="rounded-lg border border-border p-4">
      {/* Заголовочная строка: слово слева, выход справа. На узком экране кнопка
          переносится под текст (`flex-wrap`) — прижимать её к правому краю там,
          где ширины нет, значит рвать строку пополам. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] leading-relaxed text-foreground">{labels.lead}</p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{labels.hint}</p>
          {/* Отдельным абзацем и тем же тоном, что подсказка: это не
              предупреждение, а разрешение не делать лишнего. */}
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{labels.skip}</p>
        </div>
        <div className="shrink-0">{startButton}</div>
      </div>

      <ul className="mt-3 space-y-2">
        {visible.map((q, i) => (
          <li key={i} className="rounded-md border border-border p-2">
            <div className="flex items-start gap-2">
              <span className="mt-1.5 w-4 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                {i + 1}
              </span>
              <textarea
                value={q}
                onChange={(e) => setAt(i, e.target.value)}
                placeholder={labels.placeholder}
                rows={2}
                className="w-full resize-y rounded border border-border bg-background p-2 text-[12px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setVoiceAt(voiceAt === i ? null : i)}
                  title={voiceAt === i ? labels.voiceClose : labels.voiceFor}
                  aria-label={voiceAt === i ? labels.voiceClose : labels.voiceFor}
                  className={`rounded border border-border p-1 transition-colors hover:bg-accent ${
                    voiceAt === i ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Mic size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  disabled={items.length < 2}
                  title={labels.removeOne}
                  aria-label={labels.removeOne}
                  className="rounded border border-border p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive disabled:opacity-40"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {/* Голос пишет В ТОТ ЖЕ текст вопроса: продиктованное встаёт туда, где
                стоял курсор, — правило одно на весь продукт. */}
            {voiceAt === i && (
              <div className="mt-2 pl-6">
                <textarea ref={voiceField} value={q} onChange={(e) => setAt(i, e.target.value)} className="hidden" />
                <VoiceInput
                  targetRef={voiceField}
                  value={q}
                  onChange={(v) => setAt(i, v)}
                  lang={lang}
                  apiUrl="/api/transcribe"
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* 🔒 СОГЛАСИЕ НА ПОДРОБНЫЙ ОПРОС — ПОД СЕМЁРКОЙ, ОБРАТНЫЙ ХОД — ПОД
          ПОСЛЕДНИМ ВОПРОСОМ. Место у обеих кнопок ровно там, где у человека
          возникает вопрос: дочитал семь — «а это всё?»; дочитал тридцать —
          «можно попроще?». Кнопка, стоящая выше своего повода, не читается.

          Обе показываются, только когда есть что раскрывать: у направления
          «своё» вопросов нет вовсе, и предлагать там подробный опрос — значит
          обещать пустоту. */}
      {hidden > 0 && (
        <div className="mt-3 rounded-md border border-dashed border-border p-2.5">
          <Button size="sm" variant="outline" className="text-[11px]" onClick={() => setExpanded(true)}>
            <ChevronDown size={11} />{labels.more}
          </Button>
          <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
            {labels.moreHint.replace("{n}", String(hidden))}
          </p>
        </div>
      )}

      {expanded && items.length > CORE && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground underline hover:text-foreground"
          >
            <ChevronUp size={11} />{labels.fewer.replace("{n}", String(CORE))}
          </button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" className="text-[11px]" onClick={addOne}>
          <Plus size={11} />{labels.add}
        </Button>
        <button
          type="button"
          onClick={() => {
            setItems(suggested.length ? [...suggested] : [""]);
            // Возврат предложенных вопросов возвращает и вид списка: иначе
            // человек, вернувший семь, продолжал бы смотреть на тридцать.
            setExpanded(false);
            setVoiceAt(null);
            toast.success(labels.restored);
          }}
          className="flex items-center gap-1 text-[11px] text-muted-foreground underline hover:text-foreground"
        >
          <RotateCcw size={11} />{labels.restore}
        </button>
        {/* Счётчик считает ВИДИМЫЕ вопросы — те, на которые человеку отвечать.
            Общее число списка ему ничего не говорит и только пугает. */}
        <span className="text-[10px] text-muted-foreground">
          {labels.count.replace("{n}", String(visible.filter((q) => q.trim()).length))}
        </span>
        <span className="flex-1" />
        {startButton}
      </div>
    </div>
  );
}
