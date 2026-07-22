"use client";

import { useEffect } from "react";

// ТОСТ — короткое всплывающее сообщение. Свой, внутри папки (закон 0): платформенный sonner сюда не
// тянем, иначе распакованный архив автоматизации остался бы без уведомлений.
//
// Общий примитив `_components/shared/`, потому что сообщать результат будет не только пульт: любая
// вкладка, которая что-то запускает, показывает ответ этим же тостом — второго не заводим.
//
// ЗАКРЫВАЕТСЯ САМ через `autoCloseMs` (успех) либо ждёт клика (отказ: причину нужно успеть прочитать).
export type ToastTone = "ok" | "fail";

export default function Toast({
  text,
  tone = "ok",
  autoCloseMs,
  onClose,
}: {
  text: string;
  tone?: ToastTone;
  /** Сам закроется через столько миллисекунд; не задано — висит до клика. */
  autoCloseMs?: number;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!autoCloseMs) return;
    const t = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(t);
  }, [autoCloseMs, onClose, text]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        data-toast={tone}
        onClick={onClose}
        className={`pointer-events-auto max-w-md cursor-pointer rounded-lg border bg-background px-4 py-3 text-center text-base font-semibold shadow-lg ${
          tone === "ok"
            ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
            : "border-rose-500/50 text-rose-600 dark:text-rose-400"
        }`}
      >
        {text}
      </div>
    </div>
  );
}
