import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

// НАВИГАЦИЯ ПРОЙДЕННОГО ШАГА (28-20, 2026-08-27).
//
// 🔒 ОТДЕЛЬНЫЙ ФАЙЛ, ПОТОМУ ЧТО ПРАВИЛО ОБЩЕЕ, А ФОРМА — НЕТ. Правило «пройденный
// шаг показывает навигацию вместо действия» я построил внутри `StepForm`, и оно
// тут же перестало работать на шаге 3: у машинного шага формы нет вовсе. Владелец
// нажал «проверить связь», увидел успех — и остался с той же кнопкой: «названия
// кнопки не изменилось, а предполагалось, что она станет шаг вперёд и назад».
//
// ✗ УРОК, КОТОРЫЙ СТОИТ НАЗВАТЬ: правило, положенное внутрь одного из двух видов
// действия, есть правило только для этого вида. Общее правило живёт там, где
// видно обоим, — иначе второй вид молча его не исполняет, и это не ловится
// типами.
//
// 🔒 ТРИ ПОЛОЖЕНИЯ ВЫВОДЯТСЯ ИЗ АДРЕСОВ, А НЕ ИЗ ПРИЗНАКА: только «вперёд»
// (первый шаг) · «назад и вперёд» (середина) · только «назад» (последний).
// Отдельный признак «какое положение» разошёлся бы с адресами при первой же
// вставке шага в середину пути.

export type StepNavLabels = { goPrev: string; goNext: string };

export function StepNav({
  prevHref,
  nextHref,
  labels,
}: {
  prevHref?: string;
  nextHref?: string;
  labels: StepNavLabels;
}) {
  if (!prevHref && !nextHref) return null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row" data-step-nav>
      {prevHref && (
        <Link
          href={prevHref}
          data-nav-prev
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border px-4 text-[length:var(--fs-small)] font-medium transition-colors hover:border-foreground/30"
        >
          <ArrowLeft size={16} aria-hidden className="shrink-0" />
          {labels.goPrev}
        </Link>
      )}
      {nextHref && (
        <Link
          href={nextHref}
          data-nav-next
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[length:var(--fs-small)] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {labels.goNext}
          <ArrowRight size={16} aria-hidden className="shrink-0" />
        </Link>
      )}
    </div>
  );
}
