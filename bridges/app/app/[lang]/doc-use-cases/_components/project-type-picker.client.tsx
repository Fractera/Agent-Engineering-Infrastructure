"use client";

// Выбор структуры проекта — первый экран пользовательских кейсов (владелец 2026-08-15).
//
// 🔒 ЗАЧЕМ ОН ВСТАЛ ПЕРЕД ВОПРОСАМИ. Семь вводных вопросов были одни на всех, и
// экран их правки (2026-08-14) лечил это наполовину: переписать чужой вопрос
// можно, но чтобы понять, О ЧЁМ спрашивать маркетплейс, надо уже знать, чем
// маркетплейс отличается от магазина. Мы просили работы у человека, который
// пришёл за ценностью и ещё ничего не получил.
//
// Теперь порядок обратный: он называет структуру, и вопросы приходят написанными
// под неё. Правка вопросов никуда не делась — она стоит следующим шагом и уже
// имеет смысл, потому что править есть что своё.
//
// 🔒 ОКНО ОТКРЫВАЕТ САМА КНОПКА, А НЕ ВОПРОСИК РЯДОМ С НЕЙ (владелец 2026-08-15,
// прямая отмена собственного первого решения). Значок-вопросик в углу кнопки —
// цель шириной в палец на телефоне: промахнуться легче, чем попасть. Поэтому вся
// кнопка открывает описание, а выбор происходит внутри окна, где кнопка выбора
// крупная и одна.
//
// 🔒 СЛОВАРЬ ОСТАЁТСЯ СЕРВЕРНЫМ. Сюда приезжают двенадцать записей ОДНОГО языка
// пропсом. Импортировать словарь панели отсюда нельзя: 82 языка × ~600 ключей
// уехали бы в браузер на каждой загрузке страницы.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export type ProjectTypeCard = {
  id: string;
  title: string;
  tagline: string;
  definition: string;
  examples: string[];
  signals: string[];
  questions: string[];
};

export type PickerLabels = {
  lead: string;
  hint: string;
  dialogExamples: string;
  dialogSignals: string;
  dialogQuestions: string;
  choose: string;
  cancel: string;
  saving: string;
  chosen: string;
  change: string;
  chosenHint: string;
  failed: string;
};

export function ProjectTypePicker(
  { types, chosen, labels }:
  { types: ProjectTypeCard[]; chosen: { id: string; title: string } | null; labels: PickerLabels },
) {
  const router = useRouter();
  // Какая карточка открыта в окне. Открытая карточка — ещё НЕ выбор: выбор
  // происходит нажатием внизу окна, и это намеренно два разных действия.
  const [open, setOpen] = useState<ProjectTypeCard | null>(null);
  const [busy, setBusy] = useState(false);

  async function choose(type: ProjectTypeCard) {
    setBusy(true);
    try {
      const r = await fetch("/api/use-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Название едет с клиента, потому что оно на языке владельца, а словарь
        // панели живёт на сервере; идентификатор сервер проверит по каталогу.
        body: JSON.stringify({ op: "project-type", typeId: type.id, typeTitle: type.title }),
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(String(d?.error ?? labels.failed));
      setOpen(null);
      // Вопросы под эту структуру подставляет СЕРВЕР при следующем рендере: они
      // лежат в словаре, который в браузер не уезжает.
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(false);
    }
  }

  // Структура уже выбрана — двенадцать кнопок больше не нужны, нужна одна строка
  // «вот что вы выбрали» и возможность передумать. Список, который остаётся
  // висеть после выбора, заставляет каждый раз перечитывать его заново.
  if (chosen) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3">
        <Check size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span className="text-[12px] font-medium text-emerald-800 dark:text-emerald-200">
          {labels.chosen.replace("{title}", chosen.title)}
        </span>
        <span className="flex-1" />
        <ChangeButton types={types} labels={labels} onPick={choose} busy={busy} />
        <p className="w-full text-[10px] leading-relaxed text-emerald-800/80 dark:text-emerald-200/80">
          {labels.chosenHint}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <p className="text-[13px] font-semibold text-foreground">{labels.lead}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{labels.hint}</p>

      {/* Ряд с переносом, а не сетка: направления разной длины, и жёсткая сетка
          растянула бы короткое имя на ширину самого длинного. */}
      <div className="mt-3 flex flex-wrap gap-2">
        {types.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setOpen(t)}
            className="flex min-w-[9rem] max-w-full flex-1 flex-col items-start gap-0.5 rounded-lg border border-border px-3 py-2 text-left transition-colors hover:border-primary hover:bg-muted"
          >
            <span className="text-[12px] font-medium text-foreground">{t.title}</span>
            <span className="text-[10px] leading-snug text-muted-foreground">{t.tagline}</span>
          </button>
        ))}
      </div>

      <TypeDialog card={open} onClose={() => setOpen(null)} onChoose={choose} busy={busy} labels={labels} />
    </div>
  );
}

/** Передумать: тот же список в окне, чтобы не возвращать двенадцать кнопок на страницу. */
function ChangeButton(
  { types, labels, onPick, busy }:
  { types: ProjectTypeCard[]; labels: PickerLabels; onPick: (t: ProjectTypeCard) => void; busy: boolean },
) {
  const [listOpen, setListOpen] = useState(false);
  const [card, setCard] = useState<ProjectTypeCard | null>(null);

  return (
    <>
      <Button size="sm" variant="outline" className="text-[11px]" onClick={() => setListOpen(true)}>
        <Pencil size={11} />{labels.change}
      </Button>

      <Dialog open={listOpen} onOpenChange={(v) => { setListOpen(v); if (!v) setCard(null); }}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-4 py-2.5 pr-10">
            <DialogTitle className="text-[13px] font-semibold">{labels.lead}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(85vh-3rem)] overflow-auto px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {types.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setCard(t)}
                  className="flex min-w-[9rem] flex-1 flex-col items-start gap-0.5 rounded-lg border border-border px-3 py-2 text-left transition-colors hover:border-primary hover:bg-muted"
                >
                  <span className="text-[12px] font-medium text-foreground">{t.title}</span>
                  <span className="text-[10px] leading-snug text-muted-foreground">{t.tagline}</span>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TypeDialog
        card={card}
        onClose={() => setCard(null)}
        onChoose={(t) => { setListOpen(false); onPick(t); }}
        busy={busy}
        labels={labels}
      />
    </>
  );
}

/**
 * Описание одного направления. Геометрия окна — та же, что у документов панели
 * (`doc-popup.client.tsx`): один стандарт окна на всю панель, чтобы человек не
 * изучал заново, где здесь закрыть.
 *
 * Семь вопросов показаны ЗДЕСЬ, до выбора, намеренно: по ним видно, о чём
 * придётся думать, — и это самый честный признак «моё это направление или нет».
 */
function TypeDialog(
  { card, onClose, onChoose, busy, labels }:
  {
    card: ProjectTypeCard | null;
    onClose: () => void;
    onChoose: (t: ProjectTypeCard) => void;
    busy: boolean;
    labels: PickerLabels;
  },
) {
  return (
    <Dialog open={Boolean(card)} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-4 py-2.5 pr-10">
          <DialogTitle className="text-[13px] font-semibold">{card?.title}</DialogTitle>
        </DialogHeader>

        {card && (
          <div className="max-h-[calc(85vh-7rem)] space-y-3 overflow-auto px-4 py-3 text-[11px] leading-relaxed">
            <p className="text-foreground">{card.definition}</p>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {labels.dialogExamples}
              </p>
              <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
                {card.examples.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>

            {/* Признаки — то, по чему человек узнаёт СЕБЯ, а не отрасль. Поэтому
                они выделены рамкой: из трёх блоков окна именно этот решает. */}
            <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {labels.dialogSignals}
              </p>
              <ul className="list-disc space-y-0.5 pl-4 text-foreground">
                {card.signals.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {labels.dialogQuestions}
              </p>
              <ol className="list-decimal space-y-0.5 pl-4 text-muted-foreground">
                {card.questions.map((q) => <li key={q}>{q}</li>)}
              </ol>
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-border px-4 py-2.5">
          <Button size="sm" variant="outline" className="text-[11px]" onClick={onClose} disabled={busy}>
            {labels.cancel}
          </Button>
          <Button size="sm" className="text-[11px]" onClick={() => card && onChoose(card)} disabled={busy}>
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            {busy ? labels.saving : labels.choose}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
