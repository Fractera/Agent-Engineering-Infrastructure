"use client";

// Окно выбора направления — ОДНО на все три места панели (2026-08-16).
//
// 🔒 ПОЧЕМУ ОНО ПОЯВИЛОСЬ: ДВА МОДАЛЬНЫХ ОКНА БЫЛИ ОТКРЫТЫ ОДНОВРЕМЕННО.
// Список направлений жил в одном окне, описание выбранного — во втором, и второе
// открывалось ПОВЕРХ первого, не закрывая его. Radix ловит нажатия в модальном
// окне и глушит их снаружи; при двух наложенных внешнее перехватывало нажатия
// внутреннего — кнопки «выбрать» и «отмена» переставали работать вовсе, и окно
// закрывалось только крестиком. Владелец описал это дословно: «нажимаю — ничего
// не происходит, закрыть можно только крестиком».
//
// Дефект того рода, что в коде не виден: оба окна написаны правильно, ошибка
// только в том, что они существуют одновременно.
//
// Теперь окно ОДНО, а внутри переключается содержимое: список → описание →
// назад к списку. Заодно появилась кнопка «назад», которой не было: из описания
// нельзя было вернуться к перечню, не закрыв всё.
//
// 🔒 ОТСТУП СНИЗУ. Подвал окна имел `py-2.5` — десять пикселей, и кнопки
// прилегали к краю. Стало `pt-3 pb-4`: снизу воздуха больше, чем сверху, потому
// что нижний край окна — граница, а верхний — соседство с содержимым.

import { useState } from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { ProjectTypeCard, PickerLabels } from "./project-type-picker.client";

export function TypeChooserDialog(
  { open, onOpenChange, types, labels, busy, onChoose, listTitle }:
  {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    types: ProjectTypeCard[];
    labels: PickerLabels;
    busy: boolean;
    onChoose: (t: ProjectTypeCard) => void;
    /** Заголовок списка. У «добавить продукт» и «передумать» он разный. */
    listTitle: string;
  },
) {
  // Какая карточка раскрыта. `null` — показываем список. Это ОДНО окно с двумя
  // состояниями, а не два окна: см. надгробие вверху файла.
  const [card, setCard] = useState<ProjectTypeCard | null>(null);

  const close = (v: boolean) => {
    onOpenChange(v);
    // Закрыли окно — забываем раскрытую карточку, иначе при следующем открытии
    // человек увидит описание, которое читал в прошлый раз, вместо списка.
    if (!v) setCard(null);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-2.5 pr-10">
          <DialogTitle className="flex items-center gap-2 text-[13px] font-semibold">
            {card && (
              <button
                type="button"
                onClick={() => setCard(null)}
                aria-label={labels.cancel}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft size={13} />
              </button>
            )}
            {card ? card.title : listTitle}
          </DialogTitle>
        </DialogHeader>

        {/* Прокручивается только середина: подвал с кнопками обязан оставаться
            на виду. Список вопросов у сложных направлений — тридцать пунктов, и
            без этого кнопка «выбрать» уезжала бы за нижний край экрана. */}
        <div className="min-h-0 flex-1 overflow-auto px-4 py-3 text-[11px] leading-relaxed">
          {!card ? (
            <>
              <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">{labels.hint}</p>
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
            </>
          ) : (
            <TypeBody card={card} labels={labels} />
          )}
        </div>

        {/* Подвал только у описания: в списке выбирать нечего, там выбор — само
            нажатие на направление. */}
        {card && (
          <DialogFooter className="shrink-0 border-t border-border px-4 pb-4 pt-3">
            <Button size="sm" variant="outline" className="text-[11px]" onClick={() => setCard(null)} disabled={busy}>
              {labels.cancel}
            </Button>
            <Button size="sm" className="text-[11px]" onClick={() => onChoose(card)} disabled={busy}>
              {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              {busy ? labels.saving : labels.choose}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Окно одного направления БЕЗ списка — для первого экрана, где перечень
 * направлений уже лежит на самой странице и дублировать его в окне незачем.
 */
export function SingleTypeDialog(
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
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-2.5 pr-10">
          <DialogTitle className="text-[13px] font-semibold">{card?.title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto px-4 py-3 text-[11px] leading-relaxed">
          {card && <TypeBody card={card} labels={labels} />}
        </div>
        <DialogFooter className="shrink-0 border-t border-border px-4 pb-4 pt-3">
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

/**
 * Начинка описания — определение, примеры, признаки, вопросы.
 *
 * 🔒 ОДНА НА ОБА ОКНА. Раньше эта разметка стояла дважды — в выборе структуры и в
 * добавлении продукта, — и правка в одной не доезжала до второй. Владелец видел
 * бы два разных окна об одном и том же.
 */
function TypeBody({ card, labels }: { card: ProjectTypeCard; labels: PickerLabels }) {
  return (
    <div className="space-y-3">
      <p className="text-foreground">{card.definition}</p>

      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {labels.dialogExamples}
        </p>
        <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
          {card.examples.map((x) => <li key={x}>{x}</li>)}
        </ul>
      </div>

      {/* Признаки — то, по чему человек узнаёт СЕБЯ, а не отрасль. Поэтому они
          выделены рамкой: из трёх блоков окна именно этот решает. */}
      <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
          {labels.dialogSignals}
        </p>
        <ul className="list-disc space-y-0.5 pl-4 text-foreground">
          {card.signals.map((x) => <li key={x}>{x}</li>)}
        </ul>
      </div>

      {/* Вопросы показаны ДО выбора намеренно: по ним видно, о чём придётся
          думать, — самый честный признак «моё это направление или нет».
          У «своего направления» их нет, и вместо пустого заголовка честнее
          сказать словами, что писать их будет владелец. */}
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {labels.dialogQuestions}
        </p>
        {card.questions.length ? (
          <ol className="list-decimal space-y-0.5 pl-4 text-muted-foreground">
            {card.questions.map((q) => <li key={q}>{q}</li>)}
          </ol>
        ) : (
          <p className="text-muted-foreground">—</p>
        )}
      </div>
    </div>
  );
}
