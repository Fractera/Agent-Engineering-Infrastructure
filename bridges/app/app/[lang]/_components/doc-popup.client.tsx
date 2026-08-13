"use client";

// Вопросик, открывающий документ (владелец 2026-08-13).
//
// ЗАЧЕМ ОТДЕЛЬНОЕ ОКНО. Зелёная врезка обещает две крупные вещи — поисковую
// оптимизацию и устанавливаемое приложение. Обещание без доказательства читается
// как реклама, а доказательство целиком на странице превратило бы короткую врезку
// в трактат. Вопросик решает обе задачи: врезка остаётся в три абзаца, а тот, кто
// хочет проверить, получает полный разбор.
//
// 🔒 РАЗМЕТКУ ДОКУМЕНТА ДЕЛАЕТ СЕРВЕР. Текст приезжает сюда готовым деревом через
// `children`: клиентский островок не разбирает markdown и не тянет библиотеку
// разбора в браузер — он открывает и закрывает окно, и это всё, что ему поручено.
//
// Прокрутка ОБЕИХ осей внутри окна: у документов есть таблицы, а таблица шире
// экрана телефона обязана прокручиваться внутри себя, а не растягивать страницу.

import { useState, type ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export function DocPopup(
  { label, title, children }:
  { label: string; title: string; children: ReactNode },
) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          title={title}
          aria-label={title}
          className="inline-flex items-center gap-1 rounded-full border border-emerald-600/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
        >
          {label}
          <HelpCircle size={10} className="shrink-0" />
        </button>
      </DialogTrigger>

      {/* Крестик закрытия рисует сам `DialogContent` — свой второй здесь был бы
          лишним. Отступы сняты в ноль, чтобы шапка и текст управляли ими сами. */}
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-4 py-2.5 pr-10">
          <DialogTitle className="text-[13px] font-semibold">{title}</DialogTitle>
        </DialogHeader>
        {/* Обе оси: по вертикали — длинный документ, по горизонтали — таблицы. */}
        <div className="max-h-[calc(85vh-3rem)] overflow-auto px-4 py-3">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
