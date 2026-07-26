"use client";

import { useEffect } from "react";

// ТОСТ — короткое всплывающее сообщение. Свой, внутри папки (закон 0): платформенный sonner сюда не
// тянем, иначе распакованный архив автоматизации остался бы без уведомлений.
//
// Общий примитив `_components/shared/`, потому что сообщать будет не только пульт: любая вкладка,
// которой есть что сказать, показывает это ЭТИМ ЖЕ тостом — второго не заводим.
//
// ТРИ ТОНА, и третий появился не ради цвета (шаг 292):
//   ok     — успех, закрывается сам через `autoCloseMs` либо кликом;
//   fail   — отказ, висит до клика: причину нужно успеть прочитать;
//   notice — НАСТУПИВШЕЕ СОБЫТИЕ КАЛЕНДАРЯ. Закрыть его кликом мимо или по телу НЕЛЬЗЯ — только явной
//            кнопкой «Окей, я понимаю». Смысл закона владельца: уведомление о событии обязано быть
//            ПРОЧИТАНО, а не смахнуто случайным кликом по странице. Тот, кто его поднял, при этом может
//            погасить его снаружи (крон прибирает неподтверждённые на следующем тике) — поэтому
//            закрытие не «принадлежит» тосту, а всегда идёт через `onClose` владельца состояния.
export type ToastTone = "ok" | "fail" | "notice";

export function Toast({
  text,
  tone = "ok",
  autoCloseMs,
  actionLabel,
  onClose,
}: {
  text: string;
  tone?: ToastTone;
  /** Сам закроется через столько миллисекунд; не задано — висит до действия. У тона notice игнорируется. */
  autoCloseMs?: number;
  /** Подпись кнопки подтверждения. Обязательна у тона notice: без неё его нечем закрыть. */
  actionLabel?: string;
  onClose: () => void;
}) {
  const mustAcknowledge = tone === "notice";

  useEffect(() => {
    if (mustAcknowledge || !autoCloseMs) return;
    const t = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(t);
  }, [autoCloseMs, mustAcknowledge, onClose, text]);

  return (
    <div
      role="status"
      aria-live="polite"
      data-toast={tone}
      onClick={mustAcknowledge ? undefined : onClose}
      className={`pointer-events-auto w-full max-w-md rounded-lg border bg-background px-4 py-3 text-center text-base font-semibold shadow-lg ${
        mustAcknowledge ? "" : "cursor-pointer"
      } ${
        tone === "ok"
          ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
          : tone === "fail"
            ? "border-rose-500/50 text-rose-600 dark:text-rose-400"
            : "border-blue-500/50 text-blue-700 dark:text-blue-300"
      }`}
    >
      <p className="whitespace-pre-line">{text}</p>
      {mustAcknowledge ? (
        <button
          type="button"
          onClick={onClose}
          className="mt-3 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

// СТОПКА — место, где тосты стоят друг над другом. Наступивших записей может быть несколько сразу
// (крон проверяет раз в период и находит все, чьё время пришло), и вторая не имеет права затереть
// первую: каждая требует отдельного подтверждения.
export function ToastStack({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4">
      {children}
    </div>
  );
}

// Одиночный тост по центру — прежний вызов (пульт, витрина) остаётся рабочим без единой правки.
export default function SingleToast(props: React.ComponentProps<typeof Toast>) {
  return (
    <ToastStack>
      <Toast {...props} />
    </ToastStack>
  );
}
