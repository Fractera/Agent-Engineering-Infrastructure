"use client";

// Копирование журнала прогона (шаг 501, 2026-08-10).
//
// Журнал ниже отрисован СЕРВЕРОМ и виден как текст — его можно выделить руками,
// а рядом стоит ссылка на скачивание. Кнопка добавляет самый короткий путь к
// главному сценарию: отказ сборки переносят агенту-программисту дословно, и
// выделять мышью сто строк ради этого никто не станет.
//
// Отказ буфера обмена (вне защищённого контекста он законен) называется прямо, а
// не выдаётся за успех: текст рядом, его видно.

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export function CopyLog(
  { text, label, copied, failed }:
  { text: string; label: string; copied: string; failed: string },
) {
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
          toast.success(copied);
        } catch {
          toast.error(failed);
        }
      }}
      className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {done ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
      {label}
    </button>
  );
}
