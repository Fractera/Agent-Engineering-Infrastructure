"use client";

import { useState } from "react";
import { chromeStrings } from "./i18n";
import { SparkleIcon, CloseIcon } from "./icons";

// «КАК ЭТО РАБОТАЕТ» (публичная поверхность) — иконка Sparkle в правом верхнем углу открывает модальное
// окно по центру: max-height 600px, вертикальная прокрутка, заголовок на языке владельца. Тело пока
// плейсхолдер — ответ на вопрос «как работает автоматизация» появится здесь из passport.howItWorks
// (шаг 265). Кнопка деградирует без JS (это допускается каноном) — текст остаётся на странице.
export default function HowItWorks({ lang }: { lang: string }) {
  const L = chromeStrings(lang);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={L.howItWorks}
        title={L.howItWorks}
        className="rounded-md border p-1.5 text-muted-foreground hover:text-foreground"
      >
        <SparkleIcon className="size-4" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-label={L.howItWorks}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[600px] w-full max-w-[600px] flex-col overflow-hidden rounded-lg border bg-background shadow-xl"
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <SparkleIcon className="size-4" />
                {L.howItWorks}
              </span>
              <button type="button" onClick={() => setOpen(false)} aria-label={L.cancel} className="text-muted-foreground hover:text-foreground">
                <CloseIcon className="size-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              <p className="text-sm text-muted-foreground">{L.howItWorksEmpty}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
