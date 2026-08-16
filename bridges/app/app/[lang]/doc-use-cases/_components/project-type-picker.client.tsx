"use client";

// Выбор структуры проекта — первый экран пользовательских кейсов (владелец 2026-08-15).
//
// 🔒 ЗАЧЕМ ОН ВСТАЛ ПЕРЕД ВОПРОСАМИ. Вводные вопросы были одни на всех, и экран
// их правки (2026-08-14) лечил это наполовину: переписать чужой вопрос можно, но
// чтобы понять, О ЧЁМ спрашивать маркетплейс, надо уже знать, чем маркетплейс
// отличается от магазина. Мы просили работы у человека, который пришёл за
// ценностью и ещё ничего не получил.
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
// 🔒 СЛОВАРЬ ОСТАЁТСЯ СЕРВЕРНЫМ. Сюда приезжают записи ОДНОГО языка пропсом.
// Импортировать словарь панели отсюда нельзя: 82 языка × ~600 ключей уехали бы в
// браузер на каждой загрузке страницы.
//
// 🪦 РАЗМЕТКА ОКНА ПЕРЕЕХАЛА В `type-dialog.client.tsx` (2026-08-16). Она стояла
// здесь и ещё раз в «добавить продукт» — двумя копиями одного и того же, и
// правка в одной не доезжала до второй. Там же вылечено главное: список и
// описание были ДВУМЯ окнами, открытыми одновременно, из-за чего кнопки внутри
// не работали вовсе.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SingleTypeDialog, TypeChooserDialog } from "./type-dialog.client";

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
  /** «Вы начинаете работать над приложением …» — ответ на нажатие. */
  started: string;
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
      // 🔒 ОТВЕТ НА ДЕЙСТВИЕ ОБЯЗАТЕЛЕН (владелец 2026-08-16). Окно закрывалось,
      // страница тихо перерисовывалась — и человек, только что нажавший «выбрать
      // этот тип приложения», не получал ни одного признака, что его услышали.
      // Действие, не ответившее ничем, читается как поломка, и его нажимают
      // второй раз.
      toast.success(labels.started.replace("{title}", type.title));
      // Вопросы под эту структуру подставляет СЕРВЕР при следующем рендере: они
      // лежат в словаре, который в браузер не уезжает.
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    } finally {
      setBusy(false);
    }
  }

  // Структура уже выбрана — весь список больше не нужен, нужна одна строка «вот
  // что вы выбрали» и возможность передумать. Список, который остаётся висеть
  // после выбора, заставляет каждый раз перечитывать его заново.
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

      {/* Здесь окно БЕЗ списка: перечень направлений уже лежит на странице выше,
          и повторять его внутри окна незачем. */}
      <SingleTypeDialog card={open} onClose={() => setOpen(null)} onChoose={choose} busy={busy} labels={labels} />
    </div>
  );
}

/** Передумать: тот же список в окне, чтобы не возвращать весь перечень на страницу. */
function ChangeButton(
  { types, labels, onPick, busy }:
  { types: ProjectTypeCard[]; labels: PickerLabels; onPick: (t: ProjectTypeCard) => void; busy: boolean },
) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="outline" className="text-[11px]" onClick={() => setOpen(true)}>
        <Pencil size={11} />{labels.change}
      </Button>

      <TypeChooserDialog
        open={open}
        onOpenChange={setOpen}
        types={types}
        labels={labels}
        busy={busy}
        onChoose={(t) => { setOpen(false); onPick(t); }}
        listTitle={labels.lead}
      />
    </>
  );
}
