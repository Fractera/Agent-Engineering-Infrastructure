"use client";

// Копирование адреса возврата OAuth (шаг 501, Ф2, партия 10).
//
// Крошечный островок ради одной вещи: адрес нужно перенести в консоль Google, и
// набирать его руками — верный способ опечататься так, что вход будет отказывать
// без объяснимой причины.
//
// Сам адрес отрисован СЕРВЕРОМ и виден как текст: если браузер откажет в буфере
// обмена (вне защищённого контекста это законно), его всё равно можно выделить и
// скопировать вручную. Кнопка добавляет удобство, а не является единственным
// путём.

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export function CopyUri({ value, copied, failed }: { value: string; copied: string; failed: string }) {
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
          toast.success(copied);
        } catch {
          // Честно: не «скопировано», а «браузер отказал». Адрес рядом, его видно.
          toast.error(failed);
        }
      }}
      className="flex w-full items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1.5 font-mono text-[10px] text-foreground transition-colors hover:bg-muted"
    >
      {done ? <Check size={10} className="shrink-0 text-green-500" /> : <Copy size={10} className="shrink-0" />}
      <span className="truncate">{value}</span>
    </button>
  );
}
